/**
 * src/hooks/useAudiences.ts
 * Hook React pour charger les audiences depuis le backend.
 */
import { extractErrorMessage } from '@/lib/api';
import {
  Audience, AudienceStatut, CreateAudienceDto, UpdateAudienceDto,
  createAudience, deleteAudience, getAudiences, updateAudience, QueryAudiences,
} from '@/services/audiences.service';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseAudiencesOptions extends QueryAudiences {
  lazy?: boolean;
}

interface UseAudiencesResult {
  audiences: Audience[];
  isLoading: boolean;
  error: string | null;
  total: number;
  refetch: () => Promise<void>;
  create: (dto: CreateAudienceDto) => Promise<Audience>;
  update: (id: number, dto: UpdateAudienceDto) => Promise<Audience>;
  remove: (id: number) => Promise<void>;
}

export function useAudiences(options: UseAudiencesOptions = {}): UseAudiencesResult {
  const { lazy = false, ...query } = options;
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [isLoading, setIsLoading] = useState(!lazy);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const loadingRef = useRef(false);

  const load = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAudiences(query);
      setAudiences(result.data);
      setTotal(result.total);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [query.dossierId, query.statut, query.dateDebut, query.dateFin]);

  useEffect(() => {
    if (!lazy) load();
  }, [lazy, load]);

  const create = useCallback(async (dto: CreateAudienceDto): Promise<Audience> => {
    const a = await createAudience(dto);
    setAudiences(prev => [a, ...prev]);
    setTotal(t => t + 1);
    return a;
  }, []);

  const update = useCallback(async (id: number, dto: UpdateAudienceDto): Promise<Audience> => {
    const updated = await updateAudience(id, dto);
    setAudiences(prev => prev.map(a => a.id === id ? updated : a));
    return updated;
  }, []);

  const remove = useCallback(async (id: number): Promise<void> => {
    await deleteAudience(id);
    setAudiences(prev => prev.filter(a => a.id !== id));
    setTotal(t => t - 1);
  }, []);

  return { audiences, isLoading, error, total, refetch: load, create, update, remove };
}
