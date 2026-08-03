/**
 * src/lib/pushNotificationsManager.ts
 * Gestionnaire des notifications Push natives (Expo Push Notifications).
 *
 * Flux :
 *  1. Demande la permission de notifications à l'OS
 *  2. Récupère le token Expo Push de l'appareil (ExponentPushToken[xxxx])
 *  3. Envoie ce token au backend via POST /auth/push-token
 *  4. Le backend peut ensuite envoyer des notifications push réelles via
 *     MessagingService.envoyerPush() avec l'Expo Access Token.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import api from './api';

// Configure le comportement d'affichage des notifications reçues quand l'app est au premier plan
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Demande les permissions et récupère le token Expo Push de l'appareil.
 * Enregistre ensuite le token sur le backend.
 * Retourne le token ou null si les permissions sont refusées.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // iOS : demander la permission explicitement
  if (Platform.OS === 'ios') {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('[PushNotifications] Permission refusée par l\'utilisateur.');
        return null;
      }
    }
  }

  // Android : créer le canal de notification
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('cabinet-manager', {
      name: 'Cabinet Manager',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1E3A5F',
      sound: 'default',
    });
  }

  try {
    // Récupérer le token Expo Push (nécessite un appareil physique ou un émulateur avec FCM)
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });
    const expoPushToken = tokenData.data;

    // Envoyer le token au backend pour l'enregistrer sur l'utilisateur connecté
    try {
      await api.post('/auth/push-token', { expoPushToken });
      console.log('[PushNotifications] Token enregistré sur le backend:', expoPushToken);
    } catch (apiErr) {
      console.warn('[PushNotifications] Impossible d\'enregistrer le token:', apiErr);
    }

    return expoPushToken;
  } catch (err) {
    // Sur simulateur iOS ou émulateur Android sans Google Play Services
    console.warn('[PushNotifications] Token indisponible (simulateur ?):', err);
    return null;
  }
}

/**
 * Affiche une notification locale immédiate (pour tests ou alertes in-app).
 */
export async function scheduleLocalNotification(title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
    },
    trigger: null, // Immédiat
  });
}
