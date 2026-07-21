/**
 * modules/journal/journal.service.ts
 * ---------------------------------------------------------------------------
 * Service PARTAGÉ (importé par DossiersModule, AudiencesModule, et plus tard
 * tout autre module métier) qui centralise l'écriture dans journal_activite.
 * C'est "l'intercepteur unique pour la journalisation" mentionné dans le
 * document d'architecture (section Monolithe Modulaire).
 *
 * UTILISATION TYPIQUE dans un autre service (voir dossiers.service.ts) :
 *
 *   await this.journalService.enregistrer({
 *     cabinetId: user.cabinetId,
 *     utilisateurId: user.id,
 *     action: 'dossier.update',
 *     entiteType: 'dossier',
 *     entiteId: dossier.id,
 *     donneesAvant: ancienEtat,
 *     donneesApres: nouvelEtat,
 *   });
 *
 * DÉBOGAGE : cette méthode ne doit JAMAIS faire échouer l'opération métier
 * qui l'a appelée. Si l'écriture du journal échoue (ex. table verrouillée),
 * on logge l'erreur côté serveur mais on ne relance PAS l'exception — perdre
 * une ligne de journal est regrettable, mais bloquer la création d'un
 * dossier à cause de ça serait pire. Voir le bloc try/catch ci-dessous.
 * ---------------------------------------------------------------------------
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JournalActivite } from './entities/journal-activite.entity';

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
      // Voir note dans le commentaire d'en-tête : on ne propage jamais cette
      // erreur vers l'appelant, mais on la journalise bruyamment côté serveur
      // pour qu'elle ne passe jamais inaperçue en supervision.
      this.logger.error(
        `Échec de l'écriture dans journal_activite pour l'action "${entree.action}" ` +
          `(entité ${entree.entiteType}#${entree.entiteId}) : ${(erreur as Error).message}`,
      );
    }
  }
}
