/**
 * src/lib/pushNotificationsManager.ts
 * Gestionnaire des notifications Push natives (Expo Push Notifications / FCM / APNs)
 * et alertes système (Cabinet Manager).
 */

import { Alert, Platform } from 'react-native';
import api from './api';

let NotificationsModule: any = null;
try {
  // Chargement dynamique si le module est présent dans le runtime
  NotificationsModule = require('expo-notifications');
  if (NotificationsModule?.setNotificationHandler) {
    NotificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }
} catch {
  // Module non présent -> fallback autonome
}

/**
 * Enregistre et récupère le token de notification du périphérique
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (NotificationsModule) {
    try {
      if (Platform.OS === 'ios' && NotificationsModule.getPermissionsAsync) {
        const { status: existingStatus } = await NotificationsModule.getPermissionsAsync();
        if (existingStatus !== 'granted' && NotificationsModule.requestPermissionsAsync) {
          const { status } = await NotificationsModule.requestPermissionsAsync();
          if (status !== 'granted') return null;
        }
      }

      if (Platform.OS === 'android' && NotificationsModule.setNotificationChannelAsync) {
        await NotificationsModule.setNotificationChannelAsync('cabinet-manager', {
          name: 'Cabinet Manager',
          importance: NotificationsModule.AndroidImportance?.HIGH ?? 4,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#1E3A5F',
          sound: 'default',
        });
      }

      if (NotificationsModule.getExpoPushTokenAsync) {
        const tokenData = await NotificationsModule.getExpoPushTokenAsync({
          projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
        });
        const expoPushToken = tokenData.data;

        try {
          await api.post('/auth/push-token', { expoPushToken });
        } catch {
          // Silent catch
        }
        return expoPushToken;
      }
    } catch (err) {
      console.warn('[PushNotifications] Erreur lors de l\'enregistrement:', err);
    }
  }

  // Fallback si le module natif n'est pas présent
  const fallbackToken = `device_push_token_${Platform.OS}_${Date.now()}`;
  try {
    await api.post('/auth/push-token', { expoPushToken: fallbackToken });
  } catch {
    // Silent catch
  }
  return fallbackToken;
}

/**
 * Envoie une alerte / notification locale immédiate
 */
export async function scheduleLocalNotification(title: string, body: string): Promise<void> {
  if (NotificationsModule?.scheduleNotificationAsync) {
    try {
      await NotificationsModule.scheduleNotificationAsync({
        content: { title, body, sound: 'default' },
        trigger: null,
      });
      return;
    } catch {
      // Fallback vers Alert si échec
    }
  }
  Alert.alert(title, body);
}
