/**
 * src/services/clients.service.ts
 * Fonctions API pour la gestion des clients du cabinet.
 */

import api from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Client {
  id: number;
  cabinetId: number;
  nomComplet: string;
  telephone: string;
  email: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClientsPage {
  page: number;
  pageSize: number;
  total: number;
  data: Client[];
}

export interface QueryClients {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateClientDto {
  nomComplet: string;
  telephone: string;
  email: string;
}

export interface UpdateClientDto {
  nomComplet?: string;
  telephone?: string;
  email?: string;
  versionConnue?: number;
}

// ── Fonctions API ─────────────────────────────────────────────────────────────

export async function getClients(params: QueryClients = {}): Promise<ClientsPage> {
  const query = {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    ...(params.search && { search: params.search }),
  };
  const { data } = await api.get<ClientsPage>('/clients', { params: query });
  return data;
}

export async function getClient(id: number): Promise<Client> {
  const { data } = await api.get<Client>(`/clients/${id}`);
  return data;
}

export async function createClient(dto: CreateClientDto): Promise<Client> {
  const { data } = await api.post<Client>('/clients', dto);
  return data;
}

export async function updateClient(id: number, dto: UpdateClientDto): Promise<Client> {
  const { data } = await api.patch<Client>(`/clients/${id}`, dto);
  return data;
}

export async function deleteClient(id: number): Promise<void> {
  await api.delete(`/clients/${id}`);
}
