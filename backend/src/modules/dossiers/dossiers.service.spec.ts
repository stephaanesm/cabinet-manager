/**
 * modules/dossiers/dossiers.service.spec.ts
 * ---------------------------------------------------------------------------
 * Le QueryBuilder TypeORM est mocké avec un objet "chaînable" (chaque méthode
 * se retourne elle-même) pour pouvoir vérifier PRÉCISÉMENT quelles clauses
 * WHERE ont été appliquées — c'est le point le plus critique à tester dans ce
 * module (filtrage RBAC + isolation multi-tenant).
 * ---------------------------------------------------------------------------
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { DossiersService } from './dossiers.service';
import { Dossier, DossierStatut } from './entities/dossier.entity';
import { ClientsService } from '../clients/clients.service';
import { JournalService } from '../journal/journal.service';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';

function buildQueryBuilderMock(returnedOne: any = null, returnedMany: [any[], number] = [[], 0]) {
  const qb: any = {};
  const chain = ['where', 'andWhere', 'orderBy', 'skip', 'take'];
  chain.forEach((method) => {
    qb[method] = jest.fn().mockReturnValue(qb);
  });
  qb.getOne = jest.fn().mockResolvedValue(returnedOne);
  qb.getManyAndCount = jest.fn().mockResolvedValue(returnedMany);
  qb.getCount = jest.fn().mockResolvedValue(0);
  return qb;
}

describe('DossiersService', () => {
  let service: DossiersService;
  let dossierRepo: any;
  let clientsService: jest.Mocked<ClientsService>;
  let journalService: jest.Mocked<JournalService>;

  const avocat: AuthenticatedUser = { id: 7, cabinetId: 1, role: 'Avocat', permissions: [] };
  const associe: AuthenticatedUser = { id: 9, cabinetId: 1, role: 'Associe', permissions: [] };

  const dossierExemple: Dossier = {
    id: 100,
    cabinetId: 1,
    clientId: 5,
    avocatResponsableId: 7,
    numeroAffaire: 'AFF-2026-0001',
    titre: 'Litige commercial',
    statut: DossierStatut.OUVERT,
    version: 3,
    dateOuverture: new Date(),
    dateCloture: null,
    juridiction: 'TGI Douala',
    notes: null,
    clientUuid: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as Dossier;

  beforeEach(async () => {
    dossierRepo = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ ...dossierExemple, ...data })),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
      manager: { query: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DossiersService,
        { provide: getRepositoryToken(Dossier), useValue: dossierRepo },
        {
          provide: ClientsService,
          useValue: { verifierAppartenance: jest.fn().mockResolvedValue({ id: 5 }) },
        },
        { provide: JournalService, useValue: { enregistrer: jest.fn() } },
      ],
    }).compile();

    service = module.get(DossiersService);
    clientsService = module.get(ClientsService);
    journalService = module.get(JournalService);
  });

  describe('create', () => {
    it("vérifie l'appartenance du client au cabinet avant de créer le dossier", async () => {
      dossierRepo.createQueryBuilder.mockReturnValue(buildQueryBuilderMock());

      await service.create({ titre: 'Nouveau dossier', clientId: 5 }, avocat);

      expect(clientsService.verifierAppartenance).toHaveBeenCalledWith(5, avocat.cabinetId);
    });

    it("assigne l'utilisateur courant comme avocat responsable si non précisé", async () => {
      dossierRepo.createQueryBuilder.mockReturnValue(buildQueryBuilderMock());

      await service.create({ titre: 'Nouveau dossier', clientId: 5 }, avocat);

      expect(dossierRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ avocatResponsableId: avocat.id }),
      );
    });

    it('respecte un avocatResponsableId explicite (cas Associé assignant un dossier)', async () => {
      dossierRepo.createQueryBuilder.mockReturnValue(buildQueryBuilderMock());

      await service.create({ titre: 'Dossier assigné', clientId: 5, avocatResponsableId: 42 }, associe);

      expect(dossierRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ avocatResponsableId: 42 }),
      );
    });

    it('journalise la création avec un instantané "après"', async () => {
      dossierRepo.createQueryBuilder.mockReturnValue(buildQueryBuilderMock());

      await service.create({ titre: 'Nouveau dossier', clientId: 5 }, avocat);

      expect(journalService.enregistrer).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'dossier.create', entiteType: 'dossier' }),
      );
    });

    it('génère un numéro d\'affaire au format "AFF-<année>-<séquence sur 4 chiffres>"', async () => {
      const qb = buildQueryBuilderMock();
      qb.getCount.mockResolvedValue(7); // 7 dossiers déjà créés cette année
      dossierRepo.createQueryBuilder.mockReturnValue(qb);

      const dossier = await service.create({ titre: 'X', clientId: 5 }, avocat);

      expect(dossier.numeroAffaire).toMatch(/^AFF-\d{4}-0008$/);
    });
  });

  describe('findOne — filtrage RBAC', () => {
    it("applique le filtre avocatResponsableId quand la portée est 'own'", async () => {
      const qb = buildQueryBuilderMock(dossierExemple);
      dossierRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findOne(100, avocat, 'own');

      expect(qb.andWhere).toHaveBeenCalledWith(
        'dossier.avocatResponsableId = :userId',
        { userId: avocat.id },
      );
    });

    it("N'applique PAS de filtre par avocat quand la portée est 'all'", async () => {
      const qb = buildQueryBuilderMock(dossierExemple);
      dossierRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findOne(100, associe, 'all');

      const appelsAvocatFilter = qb.andWhere.mock.calls.filter(
        (call: any[]) => call[0] === 'dossier.avocatResponsableId = :userId',
      );
      expect(appelsAvocatFilter).toHaveLength(0);
    });

    it('applique TOUJOURS le filtre cabinetId, quelle que soit la portée (isolation multi-tenant)', async () => {
      const qb = buildQueryBuilderMock(dossierExemple);
      dossierRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findOne(100, associe, 'all');

      expect(qb.andWhere).toHaveBeenCalledWith('dossier.cabinetId = :cabinetId', {
        cabinetId: associe.cabinetId,
      });
    });

    it("lève 404 (jamais 403) si le dossier n'est pas trouvé dans la portée autorisée", async () => {
      const qb = buildQueryBuilderMock(null);
      dossierRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(service.findOne(999, avocat, 'own')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('met à jour les champs fournis et journalise avant/après', async () => {
      const qb = buildQueryBuilderMock(dossierExemple);
      dossierRepo.createQueryBuilder.mockReturnValue(qb);

      await service.update(100, { titre: 'Titre modifié' }, avocat, 'own');

      expect(dossierRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ titre: 'Titre modifié' }),
      );
      expect(journalService.enregistrer).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'dossier.update' }),
      );
    });

    it('lève 409 Conflict si versionConnue ne correspond pas à la version actuelle', async () => {
      const qb = buildQueryBuilderMock({ ...dossierExemple, version: 5 });
      dossierRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.update(100, { titre: 'X', versionConnue: 3 }, avocat, 'own'),
      ).rejects.toThrow(ConflictException);
    });

    it("n'effectue AUCUNE écriture si le conflit de version est détecté", async () => {
      const qb = buildQueryBuilderMock({ ...dossierExemple, version: 5 });
      dossierRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.update(100, { titre: 'X', versionConnue: 3 }, avocat, 'own'),
      ).rejects.toThrow(ConflictException);
      expect(dossierRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('cloturer — transitions de statut', () => {
    it('autorise la clôture depuis le statut "Ouvert"', async () => {
      const qb = buildQueryBuilderMock({ ...dossierExemple, statut: DossierStatut.OUVERT });
      dossierRepo.createQueryBuilder.mockReturnValue(qb);

      const resultat = await service.cloturer(100, avocat, 'own');

      expect(resultat.statut).toBe(DossierStatut.CLOTURE);
      expect(resultat.dateCloture).toBeTruthy();
    });

    it('autorise la clôture depuis le statut "En cours"', async () => {
      const qb = buildQueryBuilderMock({ ...dossierExemple, statut: DossierStatut.EN_COURS });
      dossierRepo.createQueryBuilder.mockReturnValue(qb);

      const resultat = await service.cloturer(100, avocat, 'own');
      expect(resultat.statut).toBe(DossierStatut.CLOTURE);
    });

    it('refuse de re-clôturer un dossier déjà clôturé (transition invalide)', async () => {
      const qb = buildQueryBuilderMock({ ...dossierExemple, statut: DossierStatut.CLOTURE });
      dossierRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(service.cloturer(100, avocat, 'own')).rejects.toThrow(BadRequestException);
    });
  });

  describe('calculerRentabilite', () => {
    it('calcule le solde restant (facturé - encaissé) à partir de la requête agrégée', async () => {
      const qb = buildQueryBuilderMock(dossierExemple);
      dossierRepo.createQueryBuilder.mockReturnValue(qb);
      dossierRepo.manager.query.mockResolvedValue([
        { total_facture: '500000', total_encaisse: '300000' },
      ]);

      const resultat = await service.calculerRentabilite(100, avocat, 'own');

      expect(resultat).toEqual({ totalFacture: 500000, totalEncaisse: 300000, soldeRestant: 200000 });
    });

    it("retourne des totaux à zéro si le dossier n'a aucune facture", async () => {
      const qb = buildQueryBuilderMock(dossierExemple);
      dossierRepo.createQueryBuilder.mockReturnValue(qb);
      dossierRepo.manager.query.mockResolvedValue([{ total_facture: '0', total_encaisse: '0' }]);

      const resultat = await service.calculerRentabilite(100, avocat, 'own');
      expect(resultat.soldeRestant).toBe(0);
    });

    it("vérifie l'accès RBAC au dossier avant de calculer la rentabilité", async () => {
      const qb = buildQueryBuilderMock(null); // dossier hors de portée
      dossierRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(service.calculerRentabilite(100, avocat, 'own')).rejects.toThrow(NotFoundException);
      expect(dossierRepo.manager.query).not.toHaveBeenCalled();
    });
  });
});
