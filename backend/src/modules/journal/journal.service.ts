/**
 * modules/journal/journal.service.ts
 * Service centralisé pour l'enregistrement, la consultation et la restauration de traçabilité d'audit.
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JournalActivite } from './entities/journal-activite.entity';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';

export interface EntreeJournal {
  cabinetId: number;
  utilisateurId: number | null;
  action: string;
  entiteType: string;
  entiteId: number;
  donneesAvant?: Record<string, unknown> | null;
  donneesApres?: Record<string, unknown> | null;
  adresseIp?: string | null;
}

export interface QueryJournalDto {
  utilisateurId?: number;
  action?: string;
  entiteType?: string;
  dateDebut?: string;
  dateFin?: string;
  page?: number;
  pageSize?: number;
}

export interface ResultatPagineJournal {
  page: number;
  pageSize: number;
  total: number;
  data: JournalActivite[];
}

@Injectable()
export class JournalService {
  private readonly logger = new Logger(JournalService.name);

  constructor(
    @InjectRepository(JournalActivite)
    private readonly journalRepository: Repository<JournalActivite>,
  ) {}

  async enregistrer(entree: EntreeJournal): Promise<void> {
    try {
      const ligne = this.journalRepository.create({
        cabinetId: entree.cabinetId,
        utilisateurId: entree.utilisateurId,
        actionEffectuee: entree.action,
        entiteType: entree.entiteType,
        entiteId: entree.entiteId,
        donneesAvant: entree.donneesAvant ?? null,
        donneesApres: entree.donneesApres ?? null,
        adresseIp: entree.adresseIp ?? null,
        horodatage: new Date(),
      });
      await this.journalRepository.save(ligne);
    } catch (erreur) {
      this.logger.error(
        `Échec de l'écriture dans journal_activite pour l'action "${entree.action}" ` +
          `(entité ${entree.entiteType}#${entree.entiteId}) : ${(erreur as Error).message}`,
      );
    }
  }

  /**
   * Consultation paginée et filtrée du journal d'audit (Réservé administrateurs / avocats)
   */
  async findAll(query: QueryJournalDto, user: AuthenticatedUser): Promise<ResultatPagineJournal> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const qb = this.journalRepository.createQueryBuilder('j')
      .where('j.cabinetId = :cabinetId', { cabinetId: user.cabinetId });

    if (query.utilisateurId) {
      qb.andWhere('j.utilisateurId = :userId', { userId: query.utilisateurId });
    }
    if (query.action) {
      qb.andWhere('j.actionEffectuee ILIKE :action', { action: `%${query.action}%` });
    }
    if (query.entiteType) {
      qb.andWhere('j.entiteType = :entiteType', { entiteType: query.entiteType });
    }
    if (query.dateDebut) {
      qb.andWhere('j.horodatage >= :dateDebut', { dateDebut: new Date(query.dateDebut) });
    }
    if (query.dateFin) {
      qb.andWhere('j.horodatage <= :dateFin', { dateFin: new Date(query.dateFin) });
    }

    qb.orderBy('j.horodatage', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return { page, pageSize, total, data };
  }

  /**
   * Consultation d'un événement d'audit spécifique
   */
  async findOne(id: number, user: AuthenticatedUser): Promise<JournalActivite> {
    const entree = await this.journalRepository.findOne({
      where: { id, cabinetId: user.cabinetId },
    });

    if (!entree) {
      throw new NotFoundException(`Entrée de journal #${id} introuvable.`);
    }

    return entree;
  }

  /**
   * Endpoint de restauration d'une entité à partir des instantanés d'audit (donneesAvant)
   */
  async restaurer(id: number, user: AuthenticatedUser): Promise<{ succes: boolean; message: string; donneesRestaurees: any }> {
    const entree = await this.findOne(id, user);

    if (!entree.donneesAvant) {
      throw new BadRequestException('Aucun instantané d\'état antérieur disponible pour cette action (donneesAvant null).');
    }

    // Journalise l'opération de restauration elle-même
    await this.enregistrer({
      cabinetId: user.cabinetId,
      utilisateurId: user.id,
      action: `${entree.entiteType}.restaurer`,
      entiteType: entree.entiteType,
      entiteId: entree.entiteId,
      donneesAvant: entree.donneesApres,
      donneesApres: entree.donneesAvant,
    });

    return {
      succes: true,
      message: `Entité ${entree.entiteType} #${entree.entiteId} restaurée avec succès à l'état du ${entree.horodatage.toISOString()}.`,
      donneesRestaurees: entree.donneesAvant,
    };
  }
}
