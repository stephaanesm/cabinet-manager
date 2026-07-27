import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum FactureStatut {
  BROUILLON = 'brouillon',
  ENVOYEE   = 'envoyee',
  PARTIELLE = 'partielle',
  PAYEE     = 'payee',
  EN_RETARD = 'en_retard',
}

@Entity('factures')
export class Facture {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @Column({ name: 'cabinet_id', type: 'bigint' })
  cabinetId: number;

  @Column({ name: 'dossier_id', type: 'bigint' })
  dossierId: number;

  @Column({ name: 'client_id', type: 'bigint' })
  clientId: number;

  @Column({ name: 'numero_facture', type: 'varchar', length: 50 })
  numeroFacture: string;

  @Column({ name: 'date_emission', type: 'date' })
  dateEmission: Date;

  @Column({ name: 'date_echeance', type: 'date', nullable: true })
  dateEcheance: Date | null;

  @Column({ name: 'montant_ht', type: 'numeric', precision: 12, scale: 2, default: 0 })
  montantHt: number;

  @Column({ name: 'taux_tva', type: 'numeric', precision: 5, scale: 2, default: 19.25 })
  tauxTva: number;

  @Column({ name: 'montant_ttc', type: 'numeric', precision: 12, scale: 2, default: 0 })
  montantTtc: number;

  @Column({ name: 'montant_encaisse', type: 'numeric', precision: 12, scale: 2, default: 0 })
  montantEncaisse: number;

  @Column({ name: 'statut', type: 'varchar', length: 30, default: FactureStatut.BROUILLON })
  statut: FactureStatut;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'version', type: 'int', default: 1 })
  version: number;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
