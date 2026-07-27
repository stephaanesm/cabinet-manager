/**
 * src/services/users.service.ts
 * Service frontend d'administration des utilisateurs du cabinet.
 */

import api from '@/lib/api';

export interface UserProfile {
  id: number;
  cabinetId: number;
  nom: string;
  email: string;
  role: string;
  permissions: string[];
  authentif2faActif: boolean;
  actif: boolean;
}

export async function getUsers(): Promise<UserProfile[]> {
  const { data } = await api.get<UserProfile[]>('/users');
  return data;
}

export async function activerUser(id: number): Promise<UserProfile> {
  const { data } = await api.patch<UserProfile>(`/users/${id}/activer`);
  return data;
}

export async function desactiverUser(id: number): Promise<UserProfile> {
  const { data } = await api.patch<UserProfile>(`/users/${id}/desactiver`);
  return data;
}
