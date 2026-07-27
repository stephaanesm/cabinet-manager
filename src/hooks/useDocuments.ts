/**
 * src/hooks/useDocuments.ts
 * Hook React pour charger les documents depuis le backend.
 */
import { extractErrorMessage } from '@/lib/api';
import {
  Document, CreateDocumentDto, UpdateDocumentDto, QueryDocuments,
  createDocument, deleteDocument, getDocuments, updateDocument,
} from '@/services/documents.service';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseDocumentsOptions extends QueryDocuments {
  lazy?: boolean;
}

interface UseDocumentsResult {
  documents: Document[];
  isLoading: boolean;
  error: string | null;
  total: number;
  refetch: () => Promise<void>;
  create: (dto: CreateDocumentDto) => Promise<Document>;
  update: (id: number, dto: UpdateDocumentDto) => Promise<Document>;
  remove: (id: number) => Promise<void>;
}

export function useDocuments(options: UseDocumentsOptions = {}): UseDocumentsResult {
  const { lazy = false, ...query } = options;
  const [documents, setDocuments] = useState<Document[]>([]);
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
      const result = await getDocuments(query);
      setDocuments(result.data);
      setTotal(result.total);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [query.dossierId, query.typeDocument, query.confidentialite, query.search]);

  useEffect(() => {
    if (!lazy) load();
  }, [lazy, load]);

  const create = useCallback(async (dto: CreateDocumentDto): Promise<Document> => {
    const d = await createDocument(dto);
    setDocuments(prev => [d, ...prev]);
    setTotal(t => t + 1);
    return d;
  }, []);

  const update = useCallback(async (id: number, dto: UpdateDocumentDto): Promise<Document> => {
    const updated = await updateDocument(id, dto);
    setDocuments(prev => prev.map(d => d.id === id ? updated : d));
    return updated;
  }, []);

  const remove = useCallback(async (id: number): Promise<void> => {
    await deleteDocument(id);
    setDocuments(prev => prev.filter(d => d.id !== id));
    setTotal(t => t - 1);
  }, []);

  return { documents, isLoading, error, total, refetch: load, create, update, remove };
}
