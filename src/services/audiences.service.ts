/**
 * src/services/audiences.service.ts
 * Fonctions API pour la gestion des audiences.
 */
import api from '@/lib/api';

export type AudienceStatut = 'prevue' | 'tenue' | 'renvoyee';

export interface Audience {
  id: number;
  cabinetId: number;
  dossierId: number;
  dateAudience: string;
  heure: string | null;
  juridiction: string | null;
  salle: string | null;
  typeAudience: string | null;
  statut: AudienceStatut;
  notes: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AudiencesPage {
  page: number;
  pageSize: number;
  total: number;
  data: Audience[];
}

export interface QueryAudiences {
  dossierId?: number;
  statut?: AudienceStatut;
  dateDebut?: string;
  dateFin?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateAudienceDto {
  dossierId: number;
  dateAudience: string;
  heure?: string;
  juridiction?: string;
  salle?: string;
  typeAudience?: string;
  statut?: AudienceStatut;
  notes?: string;
}

export interface UpdateAudienceDto {
  dateAudience?: string;
  heure?: string;
  juridiction?: string;
  salle?: string;
  typeAudience?: string;
  statut?: AudienceStatut;
  notes?: string;
  versionConnue?: number;
}

export async function getAudiences(params: QueryAudiences = {}): Promise<AudiencesPage> {
  const { data } = await api.get<AudiencesPage>('/audiences', {
    params: { page: 1, pageSize: 50, ...params },
  });
  return data;
}

export async function getAudience(id: number): Promise<Audience> {
  const { data } = await api.get<Audience>(`/audiences/${id}`);
  return data;
}

export async function createAudience(dto: CreateAudienceDto): Promise<Audience> {
  const { data } = await api.post<Audience>('/audiences', dto);
  return data;
}

export async function updateAudience(id: number, dto: UpdateAudienceDto): Promise<Audience> {
  const { data } = await api.patch<Audience>(`/audiences/${id}`, dto);
  return data;
}

export async function deleteAudience(id: number): Promise<void> {
  await api.delete(`/audiences/${id}`);
}
