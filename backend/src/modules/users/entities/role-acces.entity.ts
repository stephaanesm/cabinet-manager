/**
 * modules/users/entities/role-acces.entity.ts
 * ---------------------------------------------------------------------------
 * Mappe la table `roles_acces` définie dans schema_cabinet_manager.sql.
 * Un rôle porte un tableau de permissions au format "ressource:action:portée"
 * (voir common/rbac/permission.util.ts pour la logique d'interprétation).
 * ---------------------------------------------------------------------------
 */
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Cabinet } from './cabinet.entity';
import { Utilisateur } from './utilisateur.entity';

export enum RoleLibelle {
  AVOCAT = 'Avocat',
  ASSISTANT = 'Assistant',
  ASSOCIE = 'Associe',
  ADMINISTRATEUR = 'Administrateur',
}

@Entity('roles_acces')
export class RoleAcces {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @Column({ name: 'cabinet_id', type: 'bigint', nullable: true })
  cabinetId: number | null;

  @ManyToOne(() => Cabinet, { nullable: true })
  @JoinColumn({ name: 'cabinet_id' })
  cabinet: Cabinet | null;

  @Column({ name: 'libelle', type: 'enum', enum: RoleLibelle })
  libelle: RoleLibelle;

  /**
   * Stockée en base comme TEXT[] Postgres. TypeORM la mappe en tableau de
   * chaînes JS directement grâce au type 'simple-array' (attention :
   * 'simple-array' TypeORM sérialise en CSV, alors que la colonne Postgres
   * réelle est un vrai TEXT[] natif — on utilise donc 'array: true' avec le
   * type 'text' pour rester fidèle au type Postgres natif).
   */
  @Column({ name: 'permissions', type: 'text', array: true, default: () => "'{}'" })
  permissions: string[];

  @Column({ name: 'est_role_systeme', type: 'boolean', default: false })
  estRoleSysteme: boolean;

  @OneToMany(() => Utilisateur, (utilisateur) => utilisateur.roleAcces)
  utilisateurs: Utilisateur[];

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
