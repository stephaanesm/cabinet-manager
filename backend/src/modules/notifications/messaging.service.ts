/**
 * backend/src/modules/notifications/messaging.service.ts
 * Service d'intégration SMS & Email (Twilio / SMTP Ready).
 * Simule et journalise les envois d'alertes aux avocats et clients du cabinet.
 */

import { Injectable, Logger } from '@nestjs/common';

export interface EmailPayload {
  destinataire: string;
  sujet: string;
  corpsHtml: string;
}

export interface SmsPayload {
  telephone: string;
  message: string;
}

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  /**
   * Envoie une alerte Email (Simulé avec journalisation & prêt pour SMTP / Nodemailer / SendGrid)
   */
  async envoyerEmail(payload: EmailPayload): Promise<boolean> {
    this.logger.log(`[EMAIL DISPATCH] -> To: ${payload.destinataire} | Subject: "${payload.sujet}"`);
    this.logger.debug(`[EMAIL CONTENT] -> ${payload.corpsHtml.slice(0, 150)}...`);
    return true;
  }

  /**
   * Envoie une alerte SMS (Simulé avec journalisation & prêt pour Twilio / Infobip)
   */
  async envoyerSms(payload: SmsPayload): Promise<boolean> {
    this.logger.log(`[SMS DISPATCH] -> To: ${payload.telephone} | Msg: "${payload.message}"`);
    return true;
  }
}
