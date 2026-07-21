/**
 * modules/clients/entities/client.entity.ts
 * ---------------------------------------------------------------------------
 * Mappe la table `clients`. Module volontairement minimal dans cette
 * livraison : seuls les champs et méthodes nécessaires pour que le module
 * Dossiers puisse référencer un client existant sont fournis. Le CRUD complet
 * (portail client, etc.) sera traité par un module Clients dédié.
 * ---------------------------------------------------------------------------
 */
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @Column({ name: 'cabinet_id', type: 'bigint' })
  cabinetId: number;

  @Column({ name: 'nom_complet', type: 'varchar', length: 200 })
  nomComplet: string;

  @Column({ name: 'telephone', type: 'varchar', length: 30, nullable: true })
  telephone: string | null;

  @Column({ name: 'email', type: 'varchar', length: 150, nullable: true })
  email: string | null;

  @Column({ name: 'version', type: 'int', default: 1 })
  version: number;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
