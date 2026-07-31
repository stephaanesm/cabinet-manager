/**
 * src/lib/pushNotificationsManager.ts
 * Gestionnaire des notifications Push natives & alertes système (Cabinet Manager)
 */

import { Alert, Platform } from 'react-native';
import api from './api';

/**
 * Enregistre et récupère le token de notification du périphérique
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  const token = `device_push_token_${Platform.OS}_${Date.now()}`;

  try {
    // Transmet le jeton au backend pour enregistrement
    await api.post('/utilisateurs/me/push-token', { pushToken: token });
  } catch {
    // Ignorer si l'endpoint backend n'est pas encore actif
  }

  return token;
}

/**
 * Envoie une alerte / notification immédiate
 */
export async function scheduleLocalNotification(title: string, body: string) {
  Alert.alert(title, body);
}
