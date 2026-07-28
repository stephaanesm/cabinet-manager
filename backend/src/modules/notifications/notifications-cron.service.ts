/**
 * backend/src/modules/notifications/notifications-cron.service.ts
 * Moteur de Rappels Programmés (Cron Scheduler).
 * Balaye régulièrement les audiences et factures pour émettre des alertes automatiques.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Audience, AudienceStatut } from '../audiences/entities/audience.entity';
import { Facture, FactureStatut } from '../facturation/entities/facture.entity';
import { Notification, NotificationType } from './entities/notification.entity';
import { MessagingService } from './messaging.service';

@Injectable()
export class NotificationsCronService {
  private readonly logger = new Logger(NotificationsCronService.name);

  constructor(
    @InjectRepository(Audience)
    private readonly audienceRepository: Repository<Audience>,
    @InjectRepository(Facture)
    private readonly factureRepository: Repository<Facture>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly messagingService: MessagingService,
  ) {}

  /**
   * Cron quotidien à 08h00 : Balaye les audiences de la journée (H-24 / H-2)
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async planifierRappelsAudiencesJournee() {
    this.logger.log('[CRON] Exécution de la vérification quotidienne des audiences...');

    const aujourdhuiStart = new Date();
    aujourdhuiStart.setHours(0, 0, 0, 0);

    const aujourdhuiEnd = new Date();
    aujourdhuiEnd.setHours(23, 59, 59, 999);

    const audiencesDuJour = await this.audienceRepository.find({
      where: {
        dateAudience: Between(aujourdhuiStart, aujourdhuiEnd),
        statut: AudienceStatut.PREVUE,
      },
    });

    for (const aud of audiencesDuJour) {
      const msg = `Rappel Audience : ${aud.typeAudience || 'Audience'} prévue aujourd'hui (${aud.heure || '09:00'}) à ${aud.juridiction || 'Tribunal'}.`;

      // Enregistrement notification
      await this.notificationRepository.save({
        cabinetId: aud.cabinetId,
        utilisateurId: 1, // Admin / Avocat
        titre: '🔔 Audience programmée aujourd\'hui',
        message: msg,
        type: NotificationType.AUDIENCE_RAPPEL,
        entiteType: 'audience',
        entiteId: aud.id,
        lu: false,
        createdAt: new Date(),
      });

      // Dispatch SMS / Email
      await this.messagingService.envoyerSms({
        telephone: '+237600000000',
        message: msg,
      });
    }
  }

  /**
   * Cron hebdomadaire : Détection des factures impayées en retard
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async verifierFacturesEnRetard() {
    this.logger.log('[CRON] Vérification des factures en retard...');

    const hier = new Date();
    hier.setDate(hier.getDate() - 1);

    const facturesRetard = await this.factureRepository.find({
      where: {
        statut: FactureStatut.EN_RETARD,
      },
    });

    for (const f of facturesRetard) {
      const msg = `La facture ${f.numeroFacture} est en retard d'encaissement. Reste dû : ${Number(f.montantTtc) - Number(f.montantEncaisse)} FCFA.`;

      await this.notificationRepository.save({
        cabinetId: f.cabinetId,
        utilisateurId: 1,
        titre: '⚠️ Facture en retard d\'encaissement',
        message: msg,
        type: NotificationType.FACTURE_RETARD,
        entiteType: 'facture',
        entiteId: f.id,
        lu: false,
        createdAt: new Date(),
      });
    }
  }
}
