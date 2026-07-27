/**
 * src/hooks/useClients.ts
 * Hook React pour charger la liste des clients depuis le backend.
 */

import { extractErrorMessage } from '@/lib/api';
import { Client, getClients, QueryClients } from '@/services/clients.service';
import { useCallback, useEffect, useState } from 'react';

interface UseClientsResult {
  clients: Client[];
  isLoading: boolean;
  error: string | null;
  total: number;
  refetch: () => Promise<void>;
}

export function useClients(options: QueryClients = {}): UseClientsResult {
  const { search, pageSize = 50 } = options;

  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getClients({ search, pageSize });
      setClients(res.data);
      setTotal(res.total);
    } catch (e) {
      setError(extractErrorMessage(e));
      setClients([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [search, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    clients,
    isLoading,
    error,
    total,
    refetch: load,
  };
}
