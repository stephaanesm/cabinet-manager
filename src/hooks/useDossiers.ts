/**
 * src/hooks/useDossiers.ts
 * Hooks pour charger les dossiers depuis le backend.
 *
 * Exports :
 *   useDossiers(options)  — liste paginée avec filtres, pagination infinie et refetch
 *   useDossier(id)        — dossier unique avec sa rentabilité
 */

import { extractErrorMessage } from '@/lib/api';
import {
    Dossier,
    DossierStatut,
    getDossier,
    getDossiers,
    getRentabiliteDossier,
    QueryDossiers,
    Rentabilite,
} from '@/services/dossiers.service';
import { useCallback, useEffect, useRef, useState } from 'react';

// ── useDossiers ───────────────────────────────────────────────────────────────

interface UseDossiersOptions {
  statut?: DossierStatut;
  avocatId?: number;
  juridiction?: string;
  pageSize?: number;
  /** Si true, ne charge pas automatiquement au montage */
  lazy?: boolean;
}

interface UseDossiersResult {
  dossiers: Dossier[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export function useDossiers(options: UseDossiersOptions = {}): UseDossiersResult {
  const { statut, avocatId, juridiction, pageSize = 20, lazy = false } = options;

  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [isLoading, setIsLoading] = useState(!lazy);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const loadingRef = useRef(false);

  const buildQuery = useCallback(
    (page: number): QueryDossiers => ({
      page,
      pageSize,
      ...(statut && { statut }),
      ...(avocatId && { avocatId }),
      ...(juridiction && { juridiction }),
    }),
    [statut, avocatId, juridiction, pageSize],
  );

  const load = useCallback(
    async (page: number, append: boolean) => {
      if (loadingRef.current) return;
      loadingRef.current = true;

      if (!append) setIsLoading(true);
      else setIsLoadingMore(true);
      setError(null);

      try {
        const result = await getDossiers(buildQuery(page));
        setTotal(result.total);
        setCurrentPage(page);
        setDossiers((prev) => (append ? [...prev, ...result.data] : result.data));
      } catch (e) {
        setError(extractErrorMessage(e));
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        loadingRef.current = false;
      }
    },
    [buildQuery],
  );

  useEffect(() => {
    if (!lazy) {
      setDossiers([]);
      load(1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statut, avocatId, juridiction, pageSize]);

  const refetch = useCallback(async () => {
    setDossiers([]);
    await load(1, false);
  }, [load]);

  const loadMore = useCallback(async () => {
    if (dossiers.length >= total || isLoadingMore) return;
    await load(currentPage + 1, true);
  }, [currentPage, dossiers.length, total, isLoadingMore, load]);

  return {
    dossiers,
    isLoading,
    isLoadingMore,
    error,
    total,
    hasMore: dossiers.length < total,
    refetch,
    loadMore,
  };
}

// ── useDossier (unique) ───────────────────────────────────────────────────────

interface UseDossierResult {
  dossier: Dossier | null;
  rentabilite: Rentabilite | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDossier(id: number): UseDossierResult {
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [rentabilite, setRentabilite] = useState<Rentabilite | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [d, r] = await Promise.all([
        getDossier(id),
        getRentabiliteDossier(id),
      ]);
      setDossier(d);
      setRentabilite(r);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { dossier, rentabilite, isLoading, error, refetch: fetchAll };
}
