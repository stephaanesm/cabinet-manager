import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('encaissements')
export class Encaissement {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @Column({ name: 'cabinet_id', type: 'bigint' })
  cabinetId: number;

  @Column({ name: 'facture_id', type: 'bigint' })
  factureId: number;

  @Column({ name: 'montant', type: 'numeric', precision: 12, scale: 2 })
  montant: number;

  @Column({ name: 'date_paiement', type: 'date' })
  datePaiement: Date;

  @Column({ name: 'mode_paiement', type: 'varchar', length: 50, nullable: true })
  modePaiement: string | null;

  @Column({ name: 'reference', type: 'varchar', length: 100, nullable: true })
  reference: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
