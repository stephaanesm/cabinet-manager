import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum AudienceStatut {
  PREVUE    = 'prevue',
  TENUE     = 'tenue',
  RENVOYEE  = 'renvoyee',
}

@Entity('audiences')
export class Audience {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @Column({ name: 'cabinet_id', type: 'bigint' })
  cabinetId: number;

  @Column({ name: 'dossier_id', type: 'bigint' })
  dossierId: number;

  @Column({ name: 'date_audience', type: 'timestamptz' })
  dateAudience: Date;

  @Column({ name: 'heure', type: 'varchar', length: 10, nullable: true })
  heure: string | null;

  @Column({ name: 'juridiction', type: 'varchar', length: 150, nullable: true })
  juridiction: string | null;

  @Column({ name: 'salle', type: 'varchar', length: 100, nullable: true })
  salle: string | null;

  @Column({ name: 'type_audience', type: 'varchar', length: 100, nullable: true })
  typeAudience: string | null;

  @Column({ name: 'statut', type: 'varchar', length: 30, default: AudienceStatut.PREVUE })
  statut: AudienceStatut;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'version', type: 'int', default: 1 })
  version: number;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
