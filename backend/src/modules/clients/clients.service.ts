/**
 * modules/clients/clients.service.ts
 * ---------------------------------------------------------------------------
 * Volontairement réduit à ce dont le module Dossiers a besoin : vérifier
 * qu'un client existe (et appartient bien au même cabinet) avant de lui
 * rattacher un nouveau dossier. Le module Clients complet (CRUD, portail)
 * sera livré séparément.
 * ---------------------------------------------------------------------------
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

  /**
   * Vérifie que le client existe, n'est pas supprimé, et appartient bien au
   * cabinet de l'utilisateur courant (isolation multi-tenant). Lève 404
   * plutôt que 403 si le client appartient à un autre cabinet, pour ne pas
   * révéler son existence (cohérent avec la politique définie dans les
   * spécifications d'API, section 1.3).
   */
  async verifierAppartenance(clientId: number, cabinetId: number): Promise<Client> {
    const client = await this.clientRepository.findOne({
      where: { id: clientId, cabinetId, deletedAt: undefined },
    });

    if (!client) {
      throw new NotFoundException({
        error: { code: 'NOT_FOUND', message: 'Client introuvable ou inaccessible.', status: 404 },
      });
    }

    return client;
  }
}
