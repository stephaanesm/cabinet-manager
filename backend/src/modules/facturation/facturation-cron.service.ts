/**
 * backend/src/modules/facturation/facturation-cron.service.ts
 * Job d'Alerte de Retard de Paiement.
 * Vérifie quotidiennement les factures dont l'échéance est dépassée.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Facture, FactureStatut } from './entities/facture.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { MessagingService } from '../notifications/messaging.service';

@Injectable()
export class FacturationCronService {
  private readonly logger = new Logger(FacturationCronService.name);

  constructor(
    @InjectRepository(Facture)
    private readonly factureRepo: Repository<Facture>,
    private readonly notificationsService: NotificationsService,
    private readonly messagingService: MessagingService,
  ) {}

  /**
   * Exécution quotidienne à 09h00 : Détection et mise à jour des factures en retard
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async verifierFacturesEchues() {
    this.logger.log('[CRON FACTURATION] Balayage des factures en retard...');

    const maintenant = new Date();

    // Trouve toutes les factures 'envoyee' ou 'partielle' dont dateEcheance < maintenant
    const facturesEchues = await this.factureRepo.find({
      where: [
        { statut: FactureStatut.ENVOYEE, dateEcheance: LessThan(maintenant) },
        { statut: FactureStatut.PARTIELLE, dateEcheance: LessThan(maintenant) },
      ],
    });

    for (const f of facturesEchues) {
      f.statut = FactureStatut.EN_RETARD;
      f.updatedAt = new Date();
      await this.factureRepo.save(f);

      const reste = Number(f.montantTtc) - Number(f.montantEncaisse);
      const msg = `La facture ${f.numeroFacture} a dépassé son échéance. Solde restant impayé : ${reste.toLocaleString('fr-FR')} FCFA.`;

      // Création alerte en BDD
      await this.notificationsService.create({
        utilisateurId: 1, // Administrateur / Avocat
        titre: `⚠️ Facture en retard : ${f.numeroFacture}`,
        message: msg,
        type: NotificationType.FACTURE_RETARD,
        entiteType: 'facture',
        entiteId: f.id,
      }, f.cabinetId);

      // Relance SMS / Email
      await this.messagingService.envoyerSms({
        telephone: '+237600000000',
        message: `Rappel Cabinet : La facture ${f.numeroFacture} d'un solde de ${reste} FCFA est en retard. Merci de régulariser.`,
      });
    }

    if (facturesEchues.length > 0) {
      this.logger.log(`[CRON FACTURATION] ${facturesEchues.length} facture(s) basculée(s) en statut 'en_retard'.`);
    }
  }
}
