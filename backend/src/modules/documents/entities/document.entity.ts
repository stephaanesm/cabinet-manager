import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum DocumentConfidentialite {
  PUBLIC        = 'public',
  CONFIDENTIEL  = 'confidentiel',
  SECRET        = 'secret',
}

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @Column({ name: 'cabinet_id', type: 'bigint' })
  cabinetId: number;

  @Column({ name: 'dossier_id', type: 'bigint', nullable: true })
  dossierId: number | null;

  @Column({ name: 'nom', type: 'varchar', length: 255 })
  nom: string;

  @Column({ name: 'type_document', type: 'varchar', length: 100, nullable: true })
  typeDocument: string | null;

  @Column({ name: 'chemin_fichier', type: 'varchar', length: 500, nullable: true })
  cheminFichier: string | null;

  @Column({ name: 'taille_ko', type: 'int', nullable: true })
  tailleKo: number | null;

  @Column({ name: 'confidentialite', type: 'varchar', length: 30, default: DocumentConfidentialite.PUBLIC })
  confidentialite: DocumentConfidentialite;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'tags', type: 'text', array: true, nullable: true })
  tags: string[] | null;

  @Column({ name: 'cree_par_id', type: 'bigint', nullable: true })
  creePar: number | null;

  @Column({ name: 'version', type: 'int', default: 1 })
  version: number;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
