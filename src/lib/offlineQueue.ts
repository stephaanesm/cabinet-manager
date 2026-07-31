/**
 * src/lib/offlineQueue.ts
 * ─────────────────────────────────────────────────────────────────
 * File d'attente de mutations hors-ligne persistée dans AsyncStorage.
 *
 * Fonctionnement :
 *   1. Quand le réseau est absent, chaque mutation CRUD est empilée ici.
 *   2. À la reconnexion, useNetworkSync appelle flush() qui envoie le lot
 *      au backend via POST /sync/batch et récupère ensuite les deltas.
 *   3. idMapping: les UUIDs temporaires (créations offline) sont remplacés
 *      par les IDs serveur définitifs dans les résultats.
 *
 * Clés AsyncStorage utilisées :
 *   - OFFLINE_QUEUE_KEY  : tableau de BatchSyncItem[]
 *   - LAST_SYNC_KEY      : ISO date de la dernière synchronisation réussie
 * ─────────────────────────────────────────────────────────────────
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const OFFLINE_QUEUE_KEY = 'cabinet_manager:offline_queue';
const LAST_SYNC_KEY     = 'cabinet_manager:last_sync_at';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ActionSync  = 'CREATE' | 'UPDATE' | 'DELETE';
export type EntiteSync  = 'dossier' | 'client' | 'audience' | 'facture' | 'document';

export interface QueueItem {
  /** UUID temporaire généré localement (nanoid / uuid v4) */
  idClient: string;
  entite: EntiteSync;
  action: ActionSync;
  donnees: Record<string, unknown>;
  /** Version connue de l'entité au moment de la mutation (optimistic lock) */
  versionConnue: number;
  /** ISO date de la mutation côté client */
  horodatageClient: string;
}

export interface SyncResultItem {
  idClient: string;
  statut: 'APPLIED' | 'CONFLICT' | 'ERROR';
  idServeur?: number;
  serveurData?: Record<string, unknown>;
  versionServeur?: number;
  message?: string;
}

export interface SyncBatchResponse {
  traites: number;
  resultats: SyncResultItem[];
  idMapping: Record<string, number>;
}

export interface DeltaResponse {
  dossiers:   unknown[];
  clients:    unknown[];
  audiences:  unknown[];
  factures:   unknown[];
  documents:  unknown[];
}

// ── Lecture / écriture de la queue ────────────────────────────────────────────

export async function getQueue(): Promise<QueueItem[]> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueueItem[]) : [];
  } catch {
    return [];
  }
}

export async function enqueue(item: Omit<QueueItem, 'horodatageClient'>): Promise<void> {
  const queue = await getQueue();
  queue.push({ ...item, horodatageClient: new Date().toISOString() });
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
}

// ── Timestamp de dernière sync ────────────────────────────────────────────────

export async function getLastSyncAt(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_SYNC_KEY);
  } catch {
    return null;
  }
}

async function saveLastSyncAt(iso: string): Promise<void> {
  await AsyncStorage.setItem(LAST_SYNC_KEY, iso);
}

// ── Flush — envoie la queue au serveur ───────────────────────────────────────

/**
 * Envoie toutes les mutations en attente au backend (POST /sync/batch).
 * Retourne le résultat du batch ou null en cas d'erreur réseau.
 */
export async function flush(): Promise<SyncBatchResponse | null> {
  const queue = await getQueue();
  if (queue.length === 0) return null;

  try {
    const { data } = await api.post<SyncBatchResponse>('/sync/batch', {
      mutations: queue,
    });

    // Vider la queue uniquement si le batch a réussi
    await clearQueue();
    await saveLastSyncAt(new Date().toISOString());

    return data;
  } catch (err) {
    // Pas de réseau : on conserve la queue pour le prochain essai
    console.warn('[OfflineQueue] flush échoué, queue conservée:', err);
    return null;
  }
}

// ── Pull des deltas depuis le serveur ────────────────────────────────────────

/**
 * Récupère les modifications serveur survenues depuis la dernière sync.
 * Retourne null si la connexion est indisponible.
 */
export async function pullDeltas(): Promise<DeltaResponse | null> {
  const depuis = await getLastSyncAt();
  const params = depuis ? { depuis } : {};

  try {
    const { data } = await api.get<DeltaResponse>('/sync/delta', { params });
    await saveLastSyncAt(new Date().toISOString());
    return data;
  } catch (err) {
    console.warn('[OfflineQueue] pullDeltas échoué:', err);
    return null;
  }
}

// ── Statistiques de la queue (pour l'UI) ─────────────────────────────────────

export async function getQueueStats(): Promise<{ count: number; oldest: string | null }> {
  const queue = await getQueue();
  if (queue.length === 0) return { count: 0, oldest: null };
  return {
    count:  queue.length,
    oldest: queue[0].horodatageClient,
  };
}
