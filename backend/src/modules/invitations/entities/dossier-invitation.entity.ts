import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type InvitationStatut = 'en_attente' | 'acceptee' | 'refusee';

@Entity('dossier_invitations')
export class DossierInvitationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'cabinet_id' })
  cabinetId: number;

  @Column({ name: 'dossier_id' })
  dossierId: number;

  @Column({ name: 'dossier_numero' })
  dossierNumero: string;

  @Column({ name: 'dossier_titre' })
  dossierTitre: string;

  @Column({ name: 'juridiction', nullable: true })
  juridiction: string;

  @Column({ name: 'inviteur_id' })
  inviteurId: number;

  @Column({ name: 'inviteur_nom' })
  inviteurNom: string;

  @Column({ name: 'inviteur_email' })
  inviteurEmail: string;

  @Column({ name: 'destinataire_id', nullable: true })
  destinataireId: number;

  @Column({ name: 'destinataire_email' })
  destinataireEmail: string;

  @Column({ type: 'varchar', default: 'en_attente' })
  statut: InvitationStatut;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
