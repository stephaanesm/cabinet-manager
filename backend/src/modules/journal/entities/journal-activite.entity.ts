/**
 * modules/journal/entities/journal-activite.entity.ts
 * ---------------------------------------------------------------------------
 * Mappe la table `journal_activite` (append-only — voir grants_app_role.sql
 * qui retire les droits UPDATE/DELETE sur cette table pour le rôle
 * applicatif). Toute action métier significative (création/modification de
 * dossier, d'audience, etc.) doit passer par JournalService.enregistrer()
 * pour y être tracée.
 * ---------------------------------------------------------------------------
 */
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('journal_activite')
export class JournalActivite {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @Column({ name: 'cabinet_id', type: 'bigint' })
  cabinetId: number;

  @Column({ name: 'utilisateur_id', type: 'bigint', nullable: true })
  utilisateurId: number | null;

  /** Ex. "dossier.create", "audience.update", "facture.paiement". */
  @Column({ name: 'action_effectuee', type: 'varchar', length: 100 })
  actionEffectuee: string;

  @Column({ name: 'entite_type', type: 'varchar', length: 50 })
  entiteType: string;

  @Column({ name: 'entite_id', type: 'bigint' })
  entiteId: number;

  /** Instantané de l'entité AVANT modification (null pour une création). */
  @Column({ name: 'donnees_avant', type: 'jsonb', nullable: true })
  donneesAvant: Record<string, unknown> | null;

  /** Instantané de l'entité APRÈS modification. */
  @Column({ name: 'donnees_apres', type: 'jsonb', nullable: true })
  donneesApres: Record<string, unknown> | null;

  @Column({ name: 'adresse_ip', type: 'inet', nullable: true })
  adresseIp: string | null;

  @Column({ name: 'horodatage', type: 'timestamptz' })
  horodatage: Date;
}
