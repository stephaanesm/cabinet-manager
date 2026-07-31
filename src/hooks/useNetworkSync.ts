/**
 * src/hooks/useNetworkSync.ts
 * ─────────────────────────────────────────────────────────────────
 * Hook de surveillance réseau et synchronisation automatique hors-ligne.
 *
 * Comportement :
 *  - Surveille l'état du réseau via l'API NetInfo de React Native.
 *  - Quand le réseau revient (isConnected: false → true), déclenche
 *    automatiquement flush() puis pullDeltas().
 *  - Expose l'état réseau courant et les statistiques de la queue offline
 *    pour l'affichage dans l'UI (ex. bandeau "Hors-ligne — X mutations en attente").
 *
 * Isolation multi-tenant :
 *  - Toutes les opérations de queue/sync sont namespaced par cabinetId.
 *  - Si cabinetId est 0 (non connecté), le hook est inactif.
 *
 * Utilisation :
 *   const { isOnline, queueCount, isSyncing, lastSyncAt, syncNow } = useNetworkSync(cabinetId);
 * ─────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  flush, getLastSyncAt, getQueueStats, pullDeltas,
  SyncBatchResponse, DeltaResponse,
} from '@/lib/offlineQueue';

export interface NetworkSyncState {
  /** true si le réseau est disponible */
  isOnline: boolean;
  /** Nombre de mutations en attente dans la queue offline */
  queueCount: number;
  /** true pendant qu'un flush/pull est en cours */
  isSyncing: boolean;
  /** ISO date de la dernière synchronisation réussie */
  lastSyncAt: string | null;
  /** Déclencher manuellement une synchronisation */
  syncNow: () => Promise<{ batch: SyncBatchResponse | null; deltas: DeltaResponse | null }>;
}

export function useNetworkSync(cabinetId: number = 0): NetworkSyncState {
  const [isOnline,    setIsOnline]    = useState(true);
  const [queueCount,  setQueueCount]  = useState(0);
  const [isSyncing,   setIsSyncing]   = useState(false);
  const [lastSyncAt,  setLastSyncAt]  = useState<string | null>(null);

  // Ref pour éviter les doubles synchronisations simultanées
  const syncingRef = useRef(false);

  // ── Rafraîchit les stats de la queue ────────────────────────────────────
  const refreshStats = useCallback(async () => {
    if (!cabinetId) return;
    const stats = await getQueueStats(cabinetId);
    setQueueCount(stats.count);
    const last = await getLastSyncAt(cabinetId);
    setLastSyncAt(last);
  }, [cabinetId]);

  // ── Synchronisation complète (flush + pull deltas) ───────────────────────
  const syncNow = useCallback(async () => {
    if (syncingRef.current || !cabinetId) return { batch: null, deltas: null };
    syncingRef.current = true;
    setIsSyncing(true);

    try {
      const batch  = await flush(cabinetId);
      const deltas = await pullDeltas(cabinetId);
      await refreshStats();
      return { batch, deltas };
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [cabinetId, refreshStats]);

  // ── Surveillance de la connexion réseau ──────────────────────────────────
  useEffect(() => {
    if (!cabinetId) return;

    // Initialisation : lire l'état réseau courant via fetch (test léger)
    const checkConnectivity = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        await fetch('https://clients3.google.com/generate_204', {
          signal: controller.signal,
          method: 'HEAD',
          cache: 'no-store',
        });
        clearTimeout(timeout);
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      }
    };

    checkConnectivity();
    refreshStats();

    // Écoute du changement d'état de l'app (arrière-plan → premier plan)
    // → déclenche une re-vérification et potentiellement une sync
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        await checkConnectivity();
        const stats = await getQueueStats(cabinetId);
        if (stats.count > 0) {
          // Il y a des mutations en attente → tenter une sync
          await syncNow();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [cabinetId, syncNow, refreshStats]);

  // ── Sync automatique quand le réseau revient ─────────────────────────────
  const prevOnlineRef = useRef(isOnline);
  useEffect(() => {
    const wasOffline = !prevOnlineRef.current;
    prevOnlineRef.current = isOnline;

    if (isOnline && wasOffline && cabinetId) {
      // Réseau vient de revenir → déclencher sync
      syncNow();
    }
  }, [isOnline, cabinetId, syncNow]);

  return { isOnline, queueCount, isSyncing, lastSyncAt, syncNow };
}
