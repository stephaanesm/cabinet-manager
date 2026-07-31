/**
 * backend/src/modules/sync/sync.service.ts
 * Service de réconciliation et synchronisation par lots (Batch Sync & Conflict Resolution).
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dossier, DossierStatut } from '../dossiers/entities/dossier.entity';
import { Audience } from '../audiences/entities/audience.entity';
import { Facture } from '../facturation/entities/facture.entity';
import { Document } from '../documents/entities/document.entity';
import { JournalService } from '../journal/journal.service';
import { BatchSyncRequestDto, ActionSync, EntiteSync, BatchSyncItemDto } from './dto/batch-sync.dto';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';

export interface ResultatItemSync {
  clientId: string;
  entiteType: string;
  action: string;
  statut: 'APPLIED' | 'CONFLICT' | 'ERROR';
  serveurId?: number;
  versionServeur?: number;
  message?: string;
  serveurData?: any;
}

export interface ReponseBatchSync {
  succes: boolean;
  horodatageSync: string;
  resultats: ResultatItemSync[];
  idMapping: Record<string, number>;
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectRepository(Dossier)
    private readonly dossierRepo: Repository<Dossier>,
    @InjectRepository(Audience)
    private readonly audienceRepo: Repository<Audience>,
    @InjectRepository(Facture)
    private readonly factureRepo: Repository<Facture>,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    private readonly journalService: JournalService,
  ) {}

  /**
   * Traite un lot de mutations hors-ligne envoyées par l'application mobile
   */
  async traiterLotMutations(dto: BatchSyncRequestDto, user: AuthenticatedUser): Promise<ReponseBatchSync> {
    const resultats: ResultatItemSync[] = [];
    const idMapping: Record<string, number> = {};

    this.logger.log(`[SYNC BATCH] Traitement de ${dto.mutations.length} mutations par lots pour le cabinet #${user.cabinetId}`);

    for (const item of dto.mutations) {
      try {
        const res = await this.traiterMutationElementaire(item, user, idMapping);
        resultats.push(res);
        if (res.clientId && res.serveurId) {
          idMapping[res.clientId] = res.serveurId;
        }
      } catch (e: any) {
        this.logger.error(`[SYNC ERROR] Échec mutation ${item.clientId} (${item.entiteType}): ${e.message}`);
        resultats.push({
          clientId: item.clientId,
          entiteType: item.entiteType,
          action: item.action,
          statut: 'ERROR',
          message: e.message || 'Erreur lors du traitement de la mutation.',
        });
      }
    }

    return {
      succes: true,
      horodatageSync: new Date().toISOString(),
      resultats,
      idMapping,
    };
  }

  /**
   * Traite une mutation individuelle avec arbitrage des conflits de version optimiste (Section 1.3)
   */
  private async traiterMutationElementaire(
    item: BatchSyncItemDto,
    user: AuthenticatedUser,
    idMapping: Record<string, number>,
  ): Promise<ResultatItemSync> {
    const cabinetId = user.cabinetId;

    if (item.entiteType === EntiteSync.DOSSIER) {
      return this.syncDossier(item, cabinetId, user.id, idMapping);
    } else if (item.entiteType === EntiteSync.AUDIENCE) {
      return this.syncAudience(item, cabinetId, user.id, idMapping);
    }

    return {
      clientId: item.clientId,
      entiteType: item.entiteType,
      action: item.action,
      statut: 'APPLIED',
      message: 'Mutation traitée avec succès.',
    };
  }

  private async syncDossier(
    item: BatchSyncItemDto,
    cabinetId: number,
    userId: number,
    idMapping: Record<string, number>,
  ): Promise<ResultatItemSync> {
    if (item.action === ActionSync.CREATE) {
      const num = item.payload.numeroAffaire || `DOS-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;
      const dossier = this.dossierRepo.create({
        cabinetId,
        clientId: item.payload.clientId ? Number(item.payload.clientId) : 1,
        avocatResponsableId: userId,
        numeroAffaire: num,
        titre: item.payload.titre || 'Dossier Hors-ligne',
        statut: item.payload.statut ? item.payload.statut as any : DossierStatut.OUVERT,
        dateOuverture: item.payload.dateOuverture ? new Date(item.payload.dateOuverture) : new Date(),
        clientUuid: item.clientId,
        notes: item.payload.notes || null,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const saved = await this.dossierRepo.save(dossier);

      await this.journalService.enregistrer({
        cabinetId, utilisateurId: userId,
        action: 'dossier.sync_create', entiteType: 'dossier',
        entiteId: saved.id, donneesApres: { ...saved },
      });

      return {
        clientId: item.clientId,
        entiteType: item.entiteType,
        action: item.action,
        statut: 'APPLIED',
        serveurId: saved.id,
        versionServeur: saved.version,
        serveurData: saved,
      };
    }

    if (item.action === ActionSync.UPDATE) {
      const targetId = item.payload.id || idMapping[item.clientId];
      if (!targetId) {
        return { clientId: item.clientId, entiteType: item.entiteType, action: item.action, statut: 'ERROR', message: 'ID serveur introuvable.' };
      }

      const dossier = await this.dossierRepo.findOne({ where: { id: targetId, cabinetId } });
      if (!dossier) {
        return { clientId: item.clientId, entiteType: item.entiteType, action: item.action, statut: 'ERROR', message: 'Dossier serveur introuvable.' };
      }

      // Arbitrage des conflits de version optimiste (Politique 1.3)
      if (item.versionConnue !== undefined && item.versionConnue < dossier.version) {
        this.logger.warn(`[SYNC CONFLIT] Conflit de version détecté sur Dossier #${targetId} (Client: v${item.versionConnue}, Serveur: v${dossier.version})`);
        return {
          clientId: item.clientId,
          entiteType: item.entiteType,
          action: item.action,
          statut: 'CONFLICT',
          serveurId: dossier.id,
          versionServeur: dossier.version,
          message: `Conflit de version (Serveur v${dossier.version}). La version serveur prévaut.`,
          serveurData: dossier,
        };
      }

      if (item.payload.titre) dossier.titre = item.payload.titre;
      if (item.payload.statut) dossier.statut = item.payload.statut;
      dossier.version += 1;
      dossier.updatedAt = new Date();

      const saved = await this.dossierRepo.save(dossier);
      return {
        clientId: item.clientId,
        entiteType: item.entiteType,
        action: item.action,
        statut: 'APPLIED',
        serveurId: saved.id,
        versionServeur: saved.version,
        serveurData: saved,
      };
    }

    return { clientId: item.clientId, entiteType: item.entiteType, action: item.action, statut: 'APPLIED' };
  }

  private async syncAudience(
    item: BatchSyncItemDto,
    cabinetId: number,
    userId: number,
    idMapping: Record<string, number>,
  ): Promise<ResultatItemSync> {
    if (item.action === ActionSync.CREATE) {
      const realDossierId = item.payload.dossierId || (item.payload.dossierClientId ? idMapping[item.payload.dossierClientId] : 1);
      const aud = this.audienceRepo.create({
        cabinetId,
        dossierId: realDossierId ?? 1,
        dateAudience: item.payload.dateAudience ? new Date(item.payload.dateAudience) : new Date(),
        heure: item.payload.heure || '09:00',
        juridiction: item.payload.juridiction || 'TGI',
        typeAudience: item.payload.typeAudience || 'Audience',
        notes: item.payload.notes || null,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const saved = await this.audienceRepo.save(aud);

      return {
        clientId: item.clientId,
        entiteType: item.entiteType,
        action: item.action,
        statut: 'APPLIED',
        serveurId: saved.id,
        versionServeur: saved.version,
        serveurData: saved,
      };
    }

    return { clientId: item.clientId, entiteType: item.entiteType, action: item.action, statut: 'APPLIED' };
  }

  /**
   * Récupération des deltas de synchronisation (modifications depuis un timestamp)
   */
  async obtenirDeltas(depuis: string, user: AuthenticatedUser) {
    const dateRef = mefDate(depuis);
    const cabinetId = user.cabinetId;

    const dossiersModifies = await this.dossierRepo.createQueryBuilder('d')
      .where('d.cabinetId = :cabinetId AND d.updatedAt >= :dateRef', { cabinetId, dateRef })
      .getMany();

    const audiencesModifiees = await this.audienceRepo.createQueryBuilder('a')
      .where('a.cabinetId = :cabinetId AND a.updatedAt >= :dateRef', { cabinetId, dateRef })
      .getMany();

    return {
      horodatageDelta: new Date().toISOString(),
      dossiers: dossiersModifies,
      audiences: audiencesModifiees,
    };
  }
}

function mefDate(val?: string): Date {
  if (!val) {
    const d = new Date();
    d.setDate(d.getDate() - 7); // Par défaut 7 jours
    return d;
  }
  return new Date(val);
}
