/**
 * src/lib/constants.ts
 * URL de base de l'API backend.
 *
 * Priorité de résolution :
 *  1. Variable d'environnement EXPO_PUBLIC_API_URL (EAS Build / .env.local)
 *  2. Détection automatique de l'IP du PC hôte via Expo Constants (Expo Go / Smartphone physique)
 *  3. Fallback Émulateur / Simulator / Localhost
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

function resolveApiBaseUrl(): string {
  // 1. Variable d'env explicite (EAS Build, .env.local, CI/CD)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. Détection automatique en développement
  if (__DEV__) {
    // Tenter d'extraire l'IP LAN du PC hôte depuis Expo Constants (sur smartphone physique via Expo Go)
    const hostUri = Constants.expoConfig?.hostUri || (Constants.manifest2?.extra?.expoGo as any)?.debuggerHost;
    if (hostUri) {
      const hostIp = hostUri.split(':')[0];
      if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
        return `http://${hostIp}:8080/api/v1`;
      }
    }

    if (Platform.OS === 'android') {
      // Émulateur Android (fallback)
      return 'http://10.0.2.2:8080/api/v1';
    }

    // iOS simulator / Web (fallback)
    return 'http://localhost:8080/api/v1';
  }

  // 3. Fallback production / LAN
  return 'http://192.168.100.132:8080/api/v1';
}

export const API_BASE_URL = resolveApiBaseUrl();

// Durée d'expiration du token d'accès en millisecondes (14 min pour avoir une marge)
export const ACCESS_TOKEN_EXPIRY_MS = 14 * 60 * 1000;
