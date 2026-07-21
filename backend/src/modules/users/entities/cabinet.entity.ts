/**
 * modules/users/entities/cabinet.entity.ts
 * ---------------------------------------------------------------------------
 * Mappe la table `cabinets` (racine du modèle multi-tenant). Volontairement
 * minimaliste ici : ce module se concentre sur Auth/RBAC, la gestion complète
 * du cabinet (facturation SaaS, etc.) sera traitée dans un module dédié.
 * ---------------------------------------------------------------------------
 */
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('cabinets')
export class Cabinet {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @Column({ name: 'nom', type: 'varchar', length: 150 })
  nom: string;

  @Column({ name: 'adresse', type: 'varchar', length: 255, nullable: true })
  adresse: string | null;

  @Column({ name: 'telephone', type: 'varchar', length: 30, nullable: true })
  telephone: string | null;

  @Column({ name: 'actif', type: 'boolean', default: true })
  actif: boolean;
}
