/**
 * modules/auth/auth.service.spec.ts
 * ---------------------------------------------------------------------------
 * Toutes les dépendances (UsersService, TokenService, TwoFactorService,
 * JwtService) sont mockées : ce test valide uniquement l'ORCHESTRATION
 * (quel appel se produit dans quel ordre, quelle exception dans quel cas),
 * pas le comportement interne de chaque dépendance (déjà testé séparément
 * dans leurs propres fichiers *.spec.ts).
 * ---------------------------------------------------------------------------
 */
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { TokenService } from './token.service';
import { TwoFactorService } from './two-factor.service';
import { RoleLibelle } from '../users/entities/role-acces.entity';
import { Utilisateur } from '../users/entities/utilisateur.entity';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let tokenService: jest.Mocked<TokenService>;
  let twoFactorService: jest.Mocked<TwoFactorService>;
  let jwtService: jest.Mocked<JwtService>;

  const utilisateurSansDeuxFA: Utilisateur = {
    id: 1,
    cabinetId: 10,
    role: RoleLibelle.AVOCAT,
    motDePasseHash: 'hash-factice',
    actif: true,
    authentif2faActif: false,
    authentif2faSecret: null,
    echecsConnexion: 0,
    verrouilleJusquA: null,
    roleAcces: { permissions: ['dossiers:read:own'] },
  } as unknown as Utilisateur;

  const utilisateurAvecDeuxFA: Utilisateur = {
    ...utilisateurSansDeuxFA,
    id: 2,
    authentif2faActif: true,
    authentif2faSecret: 'secret-chiffre-factice',
  } as unknown as Utilisateur;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            estVerrouille: jest.fn().mockReturnValue(false),
            enregistrerEchecConnexion: jest.fn(),
            reinitialiserEchecsConnexion: jest.fn(),
            activerDeuxFacteurs: jest.fn(),
            desactiverDeuxFacteurs: jest.fn(),
          },
        },
        {
          provide: TokenService,
          useValue: {
            emettrePaireDeJetons: jest.fn(),
            rafraichir: jest.fn(),
            revoquerToken: jest.fn(),
            trouverUtilisateurIdParToken: jest.fn(),
          },
        },
        {
          provide: TwoFactorService,
          useValue: {
            genererSecret: jest.fn(),
            genererUriProvisionnement: jest.fn(),
            verifierCode: jest.fn(),
            chiffrerSecret: jest.fn(),
            dechiffrerSecret: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn(), verify: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    usersService = module.get(UsersService);
    tokenService = module.get(TokenService);
    twoFactorService = module.get(TwoFactorService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('login', () => {
    it('rejette avec un message générique si l\'email est inconnu (anti-énumération)', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login({ email: 'inconnu@x.cm', motDePasse: 'x' }, 'device-1')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejette avec le MÊME message générique si le mot de passe est incorrect', async () => {
      usersService.findByEmail.mockResolvedValue(utilisateurSansDeuxFA);
      jest.spyOn(argon2, 'verify').mockResolvedValue(false as any);

      try {
        await service.login({ email: 'a@x.cm', motDePasse: 'mauvais' }, 'device-1');
        fail('devait lever une exception');
      } catch (e: any) {
        expect(e.getResponse().error.message).toBe('Identifiants invalides.');
      }
      // Vérifie que l'échec est bien comptabilisé (protection anti-bruteforce)
      expect(usersService.enregistrerEchecConnexion).toHaveBeenCalledWith(utilisateurSansDeuxFA);
    });

    it('rejette si le compte est verrouillé, SANS même vérifier le mot de passe', async () => {
      usersService.findByEmail.mockResolvedValue(utilisateurSansDeuxFA);
      usersService.estVerrouille.mockReturnValue(true);
      const spyVerify = jest.spyOn(argon2, 'verify');

      await expect(service.login({ email: 'a@x.cm', motDePasse: 'x' }, 'device-1')).rejects.toThrow(
        /verrouillé/,
      );
      expect(spyVerify).not.toHaveBeenCalled();
    });

    it('émet directement une paire de jetons si le mot de passe est correct et le 2FA désactivé', async () => {
      usersService.findByEmail.mockResolvedValue(utilisateurSansDeuxFA);
      jest.spyOn(argon2, 'verify').mockResolvedValue(true as any);
      tokenService.emettrePaireDeJetons.mockResolvedValue({
        accessToken: 'AT',
        refreshToken: 'RT',
        expiresIn: 900,
      });

      const resultat = await service.login({ email: 'a@x.cm', motDePasse: 'bon' }, 'device-1');

      expect(resultat.requiresTwoFactor).toBe(false);
      expect(usersService.reinitialiserEchecsConnexion).toHaveBeenCalled();
      expect(tokenService.emettrePaireDeJetons).toHaveBeenCalledWith(
        utilisateurSansDeuxFA,
        ['dossiers:read:own'],
        'device-1',
      );
    });

    it('retourne requiresTwoFactor=true SANS émettre de jetons finaux si le 2FA est activé', async () => {
      usersService.findByEmail.mockResolvedValue(utilisateurAvecDeuxFA);
      jest.spyOn(argon2, 'verify').mockResolvedValue(true as any);
      jwtService.sign.mockReturnValue('pre-auth-token-factice');

      const resultat = await service.login({ email: 'b@x.cm', motDePasse: 'bon' }, 'device-1');

      expect(resultat.requiresTwoFactor).toBe(true);
      expect((resultat as any).preAuthToken).toBe('pre-auth-token-factice');
      expect(tokenService.emettrePaireDeJetons).not.toHaveBeenCalled();
    });
  });

  describe('verifierDeuxFacteurs', () => {
    it('rejette si le preAuthToken est invalide/expiré', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(
        service.verifierDeuxFacteurs({ preAuthToken: 'invalide', code: '123456' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejette si le token ne porte pas le "purpose" attendu (anti-détournement)', async () => {
      jwtService.verify.mockReturnValue({ sub: 2, purpose: 'autre_chose', appareilId: 'device-1' });

      await expect(
        service.verifierDeuxFacteurs({ preAuthToken: 'token', code: '123456' }),
      ).rejects.toThrow(/invalide pour cette opération/);
    });

    it('rejette si le code TOTP est incorrect', async () => {
      jwtService.verify.mockReturnValue({ sub: 2, purpose: '2fa_pending', appareilId: 'device-1' });
      usersService.findById.mockResolvedValue(utilisateurAvecDeuxFA);
      twoFactorService.dechiffrerSecret.mockReturnValue('secret-clair');
      twoFactorService.verifierCode.mockReturnValue(false);

      await expect(
        service.verifierDeuxFacteurs({ preAuthToken: 'token', code: '000000' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('émet la paire de jetons finale si le code TOTP est correct', async () => {
      jwtService.verify.mockReturnValue({ sub: 2, purpose: '2fa_pending', appareilId: 'device-1' });
      usersService.findById.mockResolvedValue(utilisateurAvecDeuxFA);
      twoFactorService.dechiffrerSecret.mockReturnValue('secret-clair');
      twoFactorService.verifierCode.mockReturnValue(true);
      tokenService.emettrePaireDeJetons.mockResolvedValue({
        accessToken: 'AT',
        refreshToken: 'RT',
        expiresIn: 900,
      });

      const resultat = await service.verifierDeuxFacteurs({ preAuthToken: 'token', code: '123456' });

      expect(resultat.accessToken).toBe('AT');
    });
  });

  describe('rafraichirJetons', () => {
    it('rejette si le refresh token ne correspond à aucun utilisateur connu', async () => {
      tokenService.trouverUtilisateurIdParToken.mockResolvedValue(null);

      await expect(service.rafraichirJetons('jeton-inconnu', 'device-1')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('charge l\'utilisateur puis délègue la validation/rotation à TokenService', async () => {
      tokenService.trouverUtilisateurIdParToken.mockResolvedValue(1);
      usersService.findById.mockResolvedValue(utilisateurSansDeuxFA);
      tokenService.rafraichir.mockResolvedValue({ accessToken: 'AT2', refreshToken: 'RT2', expiresIn: 900 });

      const resultat = await service.rafraichirJetons('jeton-valide', 'device-1');

      expect(resultat.accessToken).toBe('AT2');
      expect(tokenService.rafraichir).toHaveBeenCalledWith(
        'jeton-valide',
        utilisateurSansDeuxFA,
        ['dossiers:read:own'],
        'device-1',
      );
    });
  });

  describe('logout', () => {
    it('délègue la révocation à TokenService', async () => {
      await service.logout('un-refresh-token');
      expect(tokenService.revoquerToken).toHaveBeenCalledWith('un-refresh-token');
    });
  });

  describe('activation du 2FA (démarrage + confirmation)', () => {
    it('démarrerActivationDeuxFacteurs génère un secret et une URI de provisionnement', async () => {
      usersService.findById.mockResolvedValue(utilisateurSansDeuxFA);
      twoFactorService.genererSecret.mockReturnValue('nouveau-secret');
      twoFactorService.genererUriProvisionnement.mockReturnValue('otpauth://totp/...');

      const resultat = await service.demarrerActivationDeuxFacteurs(1);

      expect(resultat.secret).toBe('nouveau-secret');
      expect(resultat.otpauthUrl).toContain('otpauth://');
    });

    it('confirmerActivationDeuxFacteurs rejette un code invalide sans activer le compte', async () => {
      twoFactorService.verifierCode.mockReturnValue(false);

      await expect(
        service.confirmerActivationDeuxFacteurs(1, 'secret-temp', '000000'),
      ).rejects.toThrow(BadRequestException);
      expect(usersService.activerDeuxFacteurs).not.toHaveBeenCalled();
    });

    it('confirmerActivationDeuxFacteurs active le compte si le code est valide', async () => {
      twoFactorService.verifierCode.mockReturnValue(true);
      twoFactorService.chiffrerSecret.mockReturnValue('secret-chiffre');
      usersService.findById.mockResolvedValue(utilisateurSansDeuxFA);

      await service.confirmerActivationDeuxFacteurs(1, 'secret-temp', '123456');

      expect(usersService.activerDeuxFacteurs).toHaveBeenCalledWith(
        utilisateurSansDeuxFA,
        'secret-chiffre',
      );
    });
  });
});
