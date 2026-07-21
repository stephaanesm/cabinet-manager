/**
 * modules/auth/entities/refresh-token.entity.ts
 * ---------------------------------------------------------------------------
 * Mappe la nouvelle table `refresh_tokens` (voir
 * postgres/migration_002_auth_module.sql). Chaque jeton de rafraîchissement
 * émis est enregistré ici — jamais en clair, seulement son empreinte SHA-256
 * — afin de pouvoir :
 *   1. Le révoquer individuellement (déconnexion à distance depuis l'espace
 *      administrateur, voir spécifications de sécurité section 4.6) ;
 *   2. Détecter un vol de jeton : si un refresh_token déjà utilisé (donc
 *      marqué "used") est présenté à nouveau, c'est le signe qu'une copie du
 *      jeton circule ailleurs -> on révoque IMMÉDIATEMENT toute la famille de
 *      jetons de cet utilisateur/appareil (voir TokenService.refresh()).
 * ---------------------------------------------------------------------------
 */
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Utilisateur } from '../../users/entities/utilisateur.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'utilisateur_id', type: 'bigint' })
  utilisateurId: number;

  @ManyToOne(() => Utilisateur)
  @JoinColumn({ name: 'utilisateur_id' })
  utilisateur: Utilisateur;

  /** Identifiant de l'appareil (mobile/navigateur) ayant demandé le jeton. */
  @Column({ name: 'appareil_id', type: 'varchar', length: 100 })
  appareilId: string;

  /** SHA-256 du jeton réel — jamais le jeton en clair n'est stocké en base. */
  @Index()
  @Column({ name: 'token_hash', type: 'varchar', length: 64 })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  /** Marqué à true dès que ce jeton a servi une fois à un /auth/refresh. */
  @Column({ name: 'used', type: 'boolean', default: false })
  used: boolean;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
