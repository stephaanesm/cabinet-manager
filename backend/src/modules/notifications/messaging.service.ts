/**
 * backend/src/modules/notifications/messaging.service.ts
 * Service d'envoi de notifications push Expo, SMS & Email.
 *
 * Push Notifications : utilise l'API Expo Push (https://exp.host/--/api/v2/push/send)
 * avec le token EXPO_ACCESS_TOKEN configuré dans .env
 *
 * SMS & Email : prêt pour Twilio / SMTP (simulé en développement)
 */

import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface EmailPayload {
  destinataire: string;
  sujet: string;
  corpsHtml: string;
}

export interface SmsPayload {
  telephone: string;
  message: string;
}

export interface PushPayload {
  /** Token Expo du destinataire (ex: ExponentPushToken[xxxx]) */
  expoPushToken: string;
  titre: string;
  corps: string;
  donnees?: Record<string, unknown>;
}

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);
  private readonly expoAccessToken = process.env.EXPO_ACCESS_TOKEN;

  // ── Push Notifications Expo ───────────────────────────────────────────────

  /**
   * Envoie une notification push via l'API Expo Push Notifications.
   * Nécessite EXPO_ACCESS_TOKEN dans .env et que l'appareil ait enregistré
   * son expoPushToken via POST /auth/push-token.
   */
  async envoyerPush(payload: PushPayload): Promise<boolean> {
    if (!payload.expoPushToken) {
      this.logger.warn('[PUSH] Token Expo absent — notification ignorée.');
      return false;
    }

    if (!this.expoAccessToken) {
      this.logger.warn('[PUSH] EXPO_ACCESS_TOKEN absent dans .env — envoi simulé.');
      this.logger.log(`[PUSH SIMULÉ] → ${payload.expoPushToken} | ${payload.titre}`);
      return true;
    }

    try {
      const response = await axios.post(
        'https://exp.host/--/api/v2/push/send',
        {
          to:    payload.expoPushToken,
          title: payload.titre,
          body:  payload.corps,
          data:  payload.donnees ?? {},
          sound: 'default',
          priority: 'high',
        },
        {
          headers: {
            'Accept':        'application/json',
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${this.expoAccessToken}`,
          },
          timeout: 8_000,
        },
      );

      const result = response.data?.data;
      if (result?.status === 'ok') {
        this.logger.log(`[PUSH OK] → ${payload.expoPushToken} | ID: ${result.id}`);
        return true;
      } else {
        this.logger.warn(`[PUSH WARN] Réponse Expo inattendue: ${JSON.stringify(result)}`);
        return false;
      }
    } catch (err: any) {
      this.logger.error(`[PUSH ERREUR] ${err?.message}`);
      return false;
    }
  }

  /**
   * Envoie plusieurs notifications push en lot (batch Expo — max 100 par appel).
   */
  async envoyerPushBatch(payloads: PushPayload[]): Promise<void> {
    if (!payloads.length) return;

    if (!this.expoAccessToken) {
      this.logger.warn(`[PUSH BATCH SIMULÉ] ${payloads.length} notifications.`);
      return;
    }

    const messages = payloads.map((p) => ({
      to:       p.expoPushToken,
      title:    p.titre,
      body:     p.corps,
      data:     p.donnees ?? {},
      sound:    'default',
      priority: 'high',
    }));

    try {
      await axios.post(
        'https://exp.host/--/api/v2/push/send',
        messages,
        {
          headers: {
            'Accept':        'application/json',
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${this.expoAccessToken}`,
          },
          timeout: 15_000,
        },
      );
      this.logger.log(`[PUSH BATCH OK] ${payloads.length} notifications envoyées.`);
    } catch (err: any) {
      this.logger.error(`[PUSH BATCH ERREUR] ${err?.message}`);
    }
  }

  // ── Email ────────────────────────────────────────────────────────────────

  /**
   * Envoie une alerte Email (Simulé — prêt pour SMTP / Nodemailer / SendGrid)
   */
  async envoyerEmail(payload: EmailPayload): Promise<boolean> {
    this.logger.log(`[EMAIL DISPATCH] -> To: ${payload.destinataire} | Subject: "${payload.sujet}"`);
    this.logger.debug(`[EMAIL CONTENT] -> ${payload.corpsHtml.slice(0, 150)}...`);
    return true;
  }

  // ── SMS ─────────────────────────────────────────────────────────────────

  /**
   * Envoie une alerte SMS (Simulé — prêt pour Twilio / Infobip)
   */
  async envoyerSms(payload: SmsPayload): Promise<boolean> {
    this.logger.log(`[SMS DISPATCH] -> To: ${payload.telephone} | Msg: "${payload.message}"`);
    return true;
  }
}
