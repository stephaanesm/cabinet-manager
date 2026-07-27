/**
 * src/services/documents.service.ts
 * Fonctions API pour la gestion des documents (GED).
 */
import api from '@/lib/api';

export type DocumentConfidentialite = 'public' | 'confidentiel' | 'secret';

export interface Document {
  id: number;
  cabinetId: number;
  dossierId: number | null;
  nom: string;
  typeDocument: string | null;
  cheminFichier: string | null;
  tailleKo: number | null;
  confidentialite: DocumentConfidentialite;
  description: string | null;
  tags: string[] | null;
  creePar: number | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentsPage {
  page: number;
  pageSize: number;
  total: number;
  data: Document[];
}

export interface QueryDocuments {
  dossierId?: number;
  typeDocument?: string;
  confidentialite?: DocumentConfidentialite;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateDocumentDto {
  nom: string;
  dossierId?: number;
  typeDocument?: string;
  cheminFichier?: string;
  tailleKo?: number;
  confidentialite?: DocumentConfidentialite;
  description?: string;
  tags?: string[];
}

export interface UpdateDocumentDto {
  nom?: string;
  typeDocument?: string;
  cheminFichier?: string;
  tailleKo?: number;
  confidentialite?: DocumentConfidentialite;
  description?: string;
  tags?: string[];
}

export async function getDocuments(params: QueryDocuments = {}): Promise<DocumentsPage> {
  const { data } = await api.get<DocumentsPage>('/documents', {
    params: { page: 1, pageSize: 50, ...params },
  });
  return data;
}

export async function getDocument(id: number): Promise<Document> {
  const { data } = await api.get<Document>(`/documents/${id}`);
  return data;
}

export async function createDocument(dto: CreateDocumentDto): Promise<Document> {
  const { data } = await api.post<Document>('/documents', dto);
  return data;
}

export async function updateDocument(id: number, dto: UpdateDocumentDto): Promise<Document> {
  const { data } = await api.patch<Document>(`/documents/${id}`, dto);
  return data;
}

export async function deleteDocument(id: number): Promise<void> {
  await api.delete(`/documents/${id}`);
}
