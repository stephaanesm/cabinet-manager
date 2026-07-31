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
 * Isolation multi-tenant :
 *   Les clés AsyncStorage sont préfixées par cabinetId pour éviter tout
 *   mélange de données entre comptes sur le même appareil.
 *   clearSessionData() doit être appelé au logout pour nettoyer toutes
 *   les données de session de l'utilisateur courant.
 *
 * Clés AsyncStorage utilisées (préfixées par cabinet_{id}:) :
 *   - offline_queue  : tableau de BatchSyncItem[]
 *   - last_sync_at   : ISO date de la dernière synchronisation réussie
 * ─────────────────────────────────────────────────────────────────
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

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

// ── Clés namespaced par cabinetId ─────────────────────────────────────────────

function queueKey(cabinetId: number): string {
  return `cabinet_${cabinetId}:offline_queue`;
}

function syncKey(cabinetId: number): string {
  return `cabinet_${cabinetId}:last_sync_at`;
}

// Clé legacy (sans cabinetId) — pour migration
const LEGACY_QUEUE_KEY   = 'cabinet_manager:offline_queue';
const LEGACY_SYNC_KEY    = 'cabinet_manager:last_sync_at';

// ── Lecture / écriture de la queue ────────────────────────────────────────────

export async function getQueue(cabinetId: number): Promise<QueueItem[]> {
  try {
    const raw = await AsyncStorage.getItem(queueKey(cabinetId));
    return raw ? (JSON.parse(raw) as QueueItem[]) : [];
  } catch {
    return [];
  }
}

export async function enqueue(item: Omit<QueueItem, 'horodatageClient'>, cabinetId: number): Promise<void> {
  const queue = await getQueue(cabinetId);
  queue.push({ ...item, horodatageClient: new Date().toISOString() });
  await AsyncStorage.setItem(queueKey(cabinetId), JSON.stringify(queue));
}

export async function clearQueue(cabinetId: number): Promise<void> {
  await AsyncStorage.removeItem(queueKey(cabinetId));
}

// ── Timestamp de dernière sync ────────────────────────────────────────────────

export async function getLastSyncAt(cabinetId: number): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(syncKey(cabinetId));
  } catch {
    return null;
  }
}

export async function saveLastSyncAt(cabinetId: number, iso: string): Promise<void> {
  await AsyncStorage.setItem(syncKey(cabinetId), iso);
}

export async function clearLastSyncAt(cabinetId: number): Promise<void> {
  await AsyncStorage.removeItem(syncKey(cabinetId));
}

/**
 * Efface toutes les données de session offline pour un cabinet donné.
 * À appeler au logout pour garantir l'isolation entre comptes.
 */
export async function clearSessionData(cabinetId: number): Promise<void> {
  await Promise.all([
    clearQueue(cabinetId),
    clearLastSyncAt(cabinetId),
    // Nettoyage des clés legacy si présentes (migration one-time)
    AsyncStorage.removeItem(LEGACY_QUEUE_KEY),
    AsyncStorage.removeItem(LEGACY_SYNC_KEY),
  ]);
}

// ── Flush — envoie la queue au serveur ───────────────────────────────────────

/**
 * Envoie toutes les mutations en attente au backend (POST /sync/batch).
 * Retourne le résultat du batch ou null en cas d'erreur réseau.
 */
export async function flush(cabinetId: number): Promise<SyncBatchResponse | null> {
  const queue = await getQueue(cabinetId);
  if (queue.length === 0) return null;

  try {
    const { data } = await api.post<SyncBatchResponse>('/sync/batch', {
      mutations: queue,
    });

    // Vider la queue uniquement si le batch a réussi
    await clearQueue(cabinetId);
    await saveLastSyncAt(cabinetId, new Date().toISOString());

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
export async function pullDeltas(cabinetId: number): Promise<DeltaResponse | null> {
  const depuis = await getLastSyncAt(cabinetId);
  const params = depuis ? { depuis } : {};

  try {
    const { data } = await api.get<DeltaResponse>('/sync/delta', { params });
    await saveLastSyncAt(cabinetId, new Date().toISOString());
    return data;
  } catch (err) {
    console.warn('[OfflineQueue] pullDeltas échoué:', err);
    return null;
  }
}

// ── Statistiques de la queue (pour l'UI) ─────────────────────────────────────

export async function getQueueStats(cabinetId: number): Promise<{ count: number; oldest: string | null }> {
  const queue = await getQueue(cabinetId);
  if (queue.length === 0) return { count: 0, oldest: null };
  return {
    count:  queue.length,
    oldest: queue[0].horodatageClient,
  };
}
