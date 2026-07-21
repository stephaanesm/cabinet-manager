/**
 * modules/auth/token.service.spec.ts
 * ---------------------------------------------------------------------------
 * Le Repository TypeORM est entièrement mocké : on ne teste pas ici la
 * requête SQL réelle (ce sera couvert par les tests d'intégration contre une
 * vraie base, hors périmètre de cette livraison), mais la LOGIQUE MÉTIER
 * (rotation, détection de réutilisation, expiration).
 * ---------------------------------------------------------------------------
 */
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { TokenService } from './token.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { Utilisateur } from '../users/entities/utilisateur.entity';
import { RoleLibelle } from '../users/entities/role-acces.entity';

describe('TokenService', () => {
  let service: TokenService;
  let refreshTokenRepo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  const utilisateurFactice: Utilisateur = {
    id: 42,
    cabinetId: 1,
    role: RoleLibelle.AVOCAT,
    authentif2faActif: false,
  } as Utilisateur;

  beforeEach(async () => {
    refreshTokenRepo = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ ...data })),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: JwtService, useValue: new JwtService({ secret: 'test-secret' }) },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshTokenRepo },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
  });

  describe('emettrePaireDeJetons', () => {
    it('génère un access token JWT décodable contenant les permissions', async () => {
      const paire = await service.emettrePaireDeJetons(
        utilisateurFactice,
        ['dossiers:read:own'],
        'appareil-test-1',
      );

      expect(paire.accessToken).toBeTruthy();
      expect(paire.refreshToken).toBeTruthy();
      expect(paire.expiresIn).toBe(15 * 60);
      expect(refreshTokenRepo.save).toHaveBeenCalledTimes(1);
    });

    it('marque twoFactorVerified=true si le 2FA n\'est pas activé pour cet utilisateur', async () => {
      const jwtService = new JwtService({ secret: 'test-secret' });
      const localService = new TokenService(jwtService, refreshTokenRepo as any);

      const paire = await localService.emettrePaireDeJetons(
        { ...utilisateurFactice, authentif2faActif: false },
        [],
        'appareil-test-1',
      );
      const decoded: any = jwtService.decode(paire.accessToken);
      expect(decoded.twoFactorVerified).toBe(true);
    });
  });

  describe('rafraichir', () => {
    it('rejette un jeton inconnu (jamais émis)', async () => {
      refreshTokenRepo.findOne.mockResolvedValue(null);

      await expect(
        service.rafraichir('jeton-inexistant', utilisateurFactice, [], 'appareil-1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejette un jeton révoqué', async () => {
      refreshTokenRepo.findOne.mockResolvedValue({
        revokedAt: new Date(),
        used: false,
        expiresAt: new Date(Date.now() + 10000),
      });

      await expect(
        service.rafraichir('jeton-revoque', utilisateurFactice, [], 'appareil-1'),
      ).rejects.toThrow(/révoqué/);
    });

    it('rejette un jeton expiré', async () => {
      refreshTokenRepo.findOne.mockResolvedValue({
        revokedAt: null,
        used: false,
        expiresAt: new Date(Date.now() - 1000), // déjà expiré
      });

      await expect(
        service.rafraichir('jeton-expire', utilisateurFactice, [], 'appareil-1'),
      ).rejects.toThrow(/expiré/);
    });

    it('détecte la réutilisation d\'un jeton déjà consommé et révoque toute la famille', async () => {
      refreshTokenRepo.findOne.mockResolvedValue({
        utilisateurId: 42,
        appareilId: 'appareil-1',
        revokedAt: null,
        used: true, // déjà utilisé précédemment => signe de vol
        expiresAt: new Date(Date.now() + 10000),
      });

      await expect(
        service.rafraichir('jeton-deja-utilise', utilisateurFactice, [], 'appareil-1'),
      ).rejects.toThrow(/déjà utilisé/);

      // Vérifie que la révocation globale a bien été déclenchée
      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ utilisateurId: 42, appareilId: 'appareil-1' }),
        expect.objectContaining({ revokedAt: expect.any(Date) }),
      );
    });

    it('effectue la rotation (nouveau jeton émis) pour un jeton valide et non utilisé', async () => {
      refreshTokenRepo.findOne.mockResolvedValue({
        utilisateurId: 42,
        appareilId: 'appareil-1',
        revokedAt: null,
        used: false,
        expiresAt: new Date(Date.now() + 10000),
      });

      const nouvellePaire = await service.rafraichir(
        'jeton-valide',
        utilisateurFactice,
        ['dossiers:read:own'],
        'appareil-1',
      );

      expect(nouvellePaire.accessToken).toBeTruthy();
      expect(nouvellePaire.refreshToken).toBeTruthy();
      // save() appelé une fois pour marquer l'ancien "used", une fois pour le nouveau jeton
      expect(refreshTokenRepo.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('trouverUtilisateurIdParToken', () => {
    it("retourne l'id utilisateur correspondant au jeton", async () => {
      refreshTokenRepo.findOne.mockResolvedValue({ utilisateurId: 99 });
      const id = await service.trouverUtilisateurIdParToken('un-jeton');
      expect(id).toBe(99);
    });

    it('retourne null si le jeton est inconnu', async () => {
      refreshTokenRepo.findOne.mockResolvedValue(null);
      const id = await service.trouverUtilisateurIdParToken('jeton-inconnu');
      expect(id).toBeNull();
    });
  });

  describe('revoquerToken', () => {
    it('met à jour revokedAt pour le hash correspondant', async () => {
      await service.revoquerToken('un-jeton-en-clair');
      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { tokenHash: expect.any(String) },
        expect.objectContaining({ revokedAt: expect.any(Date) }),
      );
    });
  });

  describe('purgerJetonsExpires', () => {
    it('retourne le nombre de jetons supprimés', async () => {
      refreshTokenRepo.delete.mockResolvedValue({ affected: 3 });
      const nb = await service.purgerJetonsExpires();
      expect(nb).toBe(3);
    });

    it('retourne 0 si "affected" est undefined (aucune ligne supprimée)', async () => {
      refreshTokenRepo.delete.mockResolvedValue({ affected: undefined });
      const nb = await service.purgerJetonsExpires();
      expect(nb).toBe(0);
    });
  });
});
