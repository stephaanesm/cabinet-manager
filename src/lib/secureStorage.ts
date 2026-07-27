/**
 * src/lib/secureStorage.ts
 * Stockage persistant des tokens JWT et métadonnées de session.
 *
 * Utilise @react-native-async-storage/async-storage — compatible New
 * Architecture sans dépendance JSI fragile.
 *
 * Note de sécurité : AsyncStorage n'est pas chiffré sur Android.
 * Pour une app de production sensible, migrer vers expo-secure-store
 * une fois que le bug JSI / New Architecture est corrigé dans une version
 * ultérieure d'Expo SDK. Les tokens JWT ont une durée de vie courte (14 min)
 * ce qui limite l'exposition en cas de compromission du stockage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ACCESS_TOKEN:  'cabinet_access_token',
  REFRESH_TOKEN: 'cabinet_refresh_token',
  DEVICE_ID:     'cabinet_device_id',
  USER:          'cabinet_user',
} as const;

async function set(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(key, value);
}

async function get(key: string): Promise<string | null> {
  return AsyncStorage.getItem(key);
}

async function remove(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

// ── Tokens ───────────────────────────────────────────────────────────────────

export async function saveTokens(access: string, refresh: string): Promise<void> {
  await Promise.all([set(KEYS.ACCESS_TOKEN, access), set(KEYS.REFRESH_TOKEN, refresh)]);
}

export async function getAccessToken(): Promise<string | null> {
  return get(KEYS.ACCESS_TOKEN);
}

export async function getRefreshToken(): Promise<string | null> {
  return get(KEYS.REFRESH_TOKEN);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([remove(KEYS.ACCESS_TOKEN), remove(KEYS.REFRESH_TOKEN)]);
}

// ── Identifiant appareil ──────────────────────────────────────────────────────

export async function getOrCreateDeviceId(): Promise<string> {
  let id = await get(KEYS.DEVICE_ID);
  if (!id) {
    id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    await set(KEYS.DEVICE_ID, id);
  }
  return id;
}

// ── Profil utilisateur en cache ───────────────────────────────────────────────

export async function saveUser(user: object): Promise<void> {
  await set(KEYS.USER, JSON.stringify(user));
}

export async function getSavedUser<T>(): Promise<T | null> {
  const raw = await get(KEYS.USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function clearUser(): Promise<void> {
  await remove(KEYS.USER);
}

// ── Tout effacer (logout) ─────────────────────────────────────────────────────

export async function clearAll(): Promise<void> {
  await Promise.all([clearTokens(), clearUser()]);
}
