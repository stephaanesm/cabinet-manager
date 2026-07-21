/**
 * src/lib/constants.ts
 * URL de base de l'API backend.
 *
 * Priorité de résolution :
 *  1. Variable d'environnement EXPO_PUBLIC_API_URL (EAS Build / .env.local)
 *  2. Détection automatique selon la plateforme (développement)
 *
 * En production, EXPO_PUBLIC_API_URL doit pointer vers l'URL Traefik :
 *   https://api.cabinetmanager.cm/api/v1
 *   (voir infrastructure/traefik/dynamic_conf.yml — router "api-router")
 *
 * En développement (si EXPO_PUBLIC_API_URL n'est pas défini) :
 *   - Émulateur Android  → http://10.0.2.2:8080/api/v1
 *   - iOS simulator       → http://localhost:8080/api/v1
 *   - Expo Go / appareil  → définir EXPO_PUBLIC_API_URL dans .env.local
 *                           avec l'IP LAN du PC (ex: http://192.168.x.x:8080/api/v1)
 *
 * Pour changer l'IP locale rapidement :
 *   Modifier EXPO_PUBLIC_API_URL dans le fichier .env.local à la racine du projet.
 */

import { Platform } from 'react-native';

function resolveApiBaseUrl(): string {
  // 1. Variable d'env explicite (EAS Build, .env.local, CI/CD)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. Détection automatique en développement
  if (__DEV__) {
    if (Platform.OS === 'android') {
      // L'émulateur Android accède à localhost de la machine hôte via 10.0.2.2
      return 'http://10.0.2.2:8080/api/v1';
    }
    // iOS simulator ou web : localhost fonctionne directement
    return 'http://localhost:8080/api/v1';
  }

  // 3. Fallback production (ne devrait pas arriver sans EXPO_PUBLIC_API_URL)
  return 'http://localhost:8080/api/v1';
}

export const API_BASE_URL = resolveApiBaseUrl();

// Durée d'expiration du token d'accès en millisecondes (14 min pour avoir une marge)
export const ACCESS_TOKEN_EXPIRY_MS = 14 * 60 * 1000;
