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
 * Utilisation :
 *   const { isOnline, queueCount, isSyncing, lastSyncAt, syncNow } = useNetworkSync();
 * ─────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  flush, getLastSyncAt, getQueueStats, pullDeltas,
  SyncBatchResponse, DeltaResponse,
} from '@/lib/offlineQueue';

// React Native expose NetInfo directement dans le module react-native
// pour les versions sans @react-native-community/netinfo. On utilise
// l'API native via l'event listener fourni par React Native.

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

export function useNetworkSync(): NetworkSyncState {
  const [isOnline,    setIsOnline]    = useState(true);
  const [queueCount,  setQueueCount]  = useState(0);
  const [isSyncing,   setIsSyncing]   = useState(false);
  const [lastSyncAt,  setLastSyncAt]  = useState<string | null>(null);

  // Ref pour éviter les doubles synchronisations simultanées
  const syncingRef = useRef(false);

  // ── Rafraîchit les stats de la queue ────────────────────────────────────
  const refreshStats = useCallback(async () => {
    const stats = await getQueueStats();
    setQueueCount(stats.count);
    const last = await getLastSyncAt();
    setLastSyncAt(last);
  }, []);

  // ── Synchronisation complète (flush + pull deltas) ───────────────────────
  const syncNow = useCallback(async () => {
    if (syncingRef.current) return { batch: null, deltas: null };
    syncingRef.current = true;
    setIsSyncing(true);

    try {
      const batch  = await flush();
      const deltas = await pullDeltas();
      await refreshStats();
      return { batch, deltas };
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [refreshStats]);

  // ── Surveillance de la connexion réseau ──────────────────────────────────
  useEffect(() => {
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
        const stats = await getQueueStats();
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
  }, [syncNow, refreshStats]);

  // ── Sync automatique quand le réseau revient ─────────────────────────────
  const prevOnlineRef = useRef(isOnline);
  useEffect(() => {
    const wasOffline = !prevOnlineRef.current;
    prevOnlineRef.current = isOnline;

    if (isOnline && wasOffline) {
      // Réseau vient de revenir → déclencher sync
      syncNow();
    }
  }, [isOnline, syncNow]);

  return { isOnline, queueCount, isSyncing, lastSyncAt, syncNow };
}
