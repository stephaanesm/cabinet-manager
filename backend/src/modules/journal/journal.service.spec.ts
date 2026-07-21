/**
 * modules/journal/journal.service.spec.ts
 * ---------------------------------------------------------------------------
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JournalService } from './journal.service';
import { JournalActivite } from './entities/journal-activite.entity';

describe('JournalService', () => {
  let service: JournalService;
  let repo: { create: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    repo = { create: jest.fn((d) => d), save: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JournalService,
        { provide: getRepositoryToken(JournalActivite), useValue: repo },
      ],
    }).compile();

    service = module.get(JournalService);
  });

  it('enregistre une entrée avec tous les champs fournis', async () => {
    repo.save.mockResolvedValue({});

    await service.enregistrer({
      cabinetId: 1,
      utilisateurId: 7,
      action: 'dossier.create',
      entiteType: 'dossier',
      entiteId: 123,
      donneesApres: { titre: 'Nouveau dossier' },
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        cabinetId: 1,
        utilisateurId: 7,
        actionEffectuee: 'dossier.create',
        entiteType: 'dossier',
        entiteId: 123,
        donneesApres: { titre: 'Nouveau dossier' },
        donneesAvant: null,
      }),
    );
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it("n'interrompt PAS l'appelant si l'écriture en base échoue (fail-safe)", async () => {
    repo.save.mockRejectedValue(new Error('connexion base perdue'));

    // La promesse doit se résoudre normalement, sans exception propagée.
    await expect(
      service.enregistrer({
        cabinetId: 1,
        utilisateurId: 7,
        action: 'dossier.create',
        entiteType: 'dossier',
        entiteId: 123,
      }),
    ).resolves.toBeUndefined();
  });

  it('accepte utilisateurId=null (action système, ex. tâche planifiée)', async () => {
    repo.save.mockResolvedValue({});

    await service.enregistrer({
      cabinetId: 1,
      utilisateurId: null,
      action: 'notification.envoi_automatique',
      entiteType: 'notification',
      entiteId: 55,
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ utilisateurId: null }),
    );
  });
});
