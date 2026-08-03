import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { IsNull, Repository } from 'typeorm';
import { RoleAcces, RoleLibelle } from './entities/role-acces.entity';
import { Utilisateur } from './entities/utilisateur.entity';

/** Nombre d'échecs de connexion consécutifs avant verrouillage temporaire. */
export const MAX_TENTATIVES_CONNEXION = 5;
/** Durée du verrouillage après dépassement du seuil ci-dessus. */
export const DUREE_VERROUILLAGE_MINUTES = 15;

export interface SafeUserProfile {
  id: number;
  cabinetId: number;
  nom: string;
  email: string;
  role: string;
  permissions: string[];
  authentif2faActif: boolean;
  actif: boolean;
}

export interface CreateUserParams {
  nom: string;
  email: string;
  motDePasse: string;
  role: RoleLibelle;
  /** Si non fourni, utilise le premier cabinet disponible (mode démo) */
  cabinetId?: number;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Utilisateur)
    private readonly utilisateurRepository: Repository<Utilisateur>,
    @InjectRepository(RoleAcces)
    private readonly roleAccesRepository: Repository<RoleAcces>,
  ) {}

  async findByEmail(email: string): Promise<Utilisateur | null> {
    return this.utilisateurRepository.findOne({
      where: { email, deletedAt: IsNull() },
      relations: ['roleAcces'],
    });
  }

  async findById(id: number): Promise<Utilisateur> {
    const utilisateur = await this.utilisateurRepository.findOne({
      where: { id },
      relations: ['roleAcces'],
    });
    if (!utilisateur) {
      throw new NotFoundException({
        error: { code: 'NOT_FOUND', message: 'Utilisateur introuvable.', status: 404 },
      });
    }
    return utilisateur;
  }

  /**
   * Crée un nouvel utilisateur via l'auto-inscription publique.
   * Le compte est créé INACTIF (actif = false) → l'admin doit l'activer.
   * Si aucun cabinetId n'est fourni, utilise le premier cabinet actif (mode démo).
   */
  async createUser(params: CreateUserParams): Promise<SafeUserProfile> {
    const { nom, email, motDePasse, role, cabinetId } = params;

    // 1. Unicité de l'email (global)
    const existant = await this.utilisateurRepository.findOne({ where: { email } });
    if (existant) {
      throw new ConflictException({
        error: { code: 'CONFLICT', message: 'Un compte avec cet email existe déjà.', status: 409 },
      });
    }

    // 2. Rôle système correspondant
    const roleAcces = await this.roleAccesRepository.findOne({
      where: { libelle: role, estRoleSysteme: true },
    });
    if (!roleAcces) {
      throw new NotFoundException({
        error: { code: 'NOT_FOUND', message: `Rôle "${role}" introuvable.`, status: 404 },
      });
    }

    // 3. Cabinet cible
    let resolvedCabinetId = cabinetId;
    if (!resolvedCabinetId) {
      const result: { id: number }[] = await this.utilisateurRepository.query(
        'SELECT id FROM cabinets WHERE actif = true ORDER BY id LIMIT 1',
      );
      if (!result || result.length === 0) {
        throw new NotFoundException({
          error: {
            code: 'NOT_FOUND',
            message: 'Aucun cabinet actif trouvé. Contactez l\'administrateur.',
            status: 404,
          },
        });
      }
      resolvedCabinetId = Number(result[0].id);
    }

    // 4. Hash argon2id
    const motDePasseHash = await argon2.hash(motDePasse, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // 5. Création inactif
    const nouvelUtilisateur = this.utilisateurRepository.create({
      cabinetId: resolvedCabinetId,
      roleAccesId: roleAcces.id,
      nom: nom.trim(),
      email: email.trim().toLowerCase(),
      motDePasseHash,
      role,
      actif: true,
      authentif2faActif: false,
      authentif2faSecret: null,
      echecsConnexion: 0,
      verrouilleJusquA: null,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    const saved = await this.utilisateurRepository.save(nouvelUtilisateur);
    return this.toSafeProfile({ ...saved, roleAcces } as Utilisateur);
  }

  /** Incrémente le compteur d'échecs et verrouille si seuil atteint. */
  async enregistrerEchecConnexion(utilisateurId: number): Promise<void> {
    const utilisateur = await this.findById(utilisateurId);
    utilisateur.echecsConnexion += 1;

    if (utilisateur.echecsConnexion >= MAX_TENTATIVES_CONNEXION) {
      const verrouilleJusquA = new Date();
      verrouilleJusquA.setMinutes(
        verrouilleJusquA.getMinutes() + DUREE_VERROUILLAGE_MINUTES,
      );
      utilisateur.verrouilleJusquA = verrouilleJusquA;
    }

    await this.utilisateurRepository.save(utilisateur);
  }

  /** Réinitialise le compteur d'échecs après une connexion réussie. */
  async reinitialiserEchecs(utilisateurId: number): Promise<void> {
    await this.utilisateurRepository.update(utilisateurId, {
      echecsConnexion: 0,
      verrouilleJusquA: undefined,
      derniereConnexion: new Date(),
    });
  }

  /** Vérifie si le compte est actuellement verrouillé. */
  estVerrouille(utilisateur: Utilisateur): boolean {
    return (
      utilisateur.verrouilleJusquA !== null &&
      utilisateur.verrouilleJusquA > new Date()
    );
  }

  /** Liste tous les utilisateurs du cabinet */
  async findAll(cabinetId: number): Promise<SafeUserProfile[]> {
    const utilisateurs = await this.utilisateurRepository.find({
      where: { cabinetId, deletedAt: IsNull() },
      relations: ['roleAcces'],
      order: { id: 'ASC' },
    });
    return utilisateurs.map((u) => this.toSafeProfile(u));
  }

  /** Activer ou désactiver un compte utilisateur */
  async setActifStatus(id: number, cabinetId: number, actif: boolean): Promise<SafeUserProfile> {
    const user = await this.utilisateurRepository.findOne({
      where: { id, cabinetId, deletedAt: IsNull() },
      relations: ['roleAcces'],
    });

    if (!user) {
      throw new NotFoundException({
        error: { code: 'NOT_FOUND', message: 'Utilisateur introuvable.', status: 404 },
      });
    }

    user.actif = actif;
    user.updatedAt = new Date();
    const updated = await this.utilisateurRepository.save(user);
    return this.toSafeProfile(updated);
  }

  /** Profil public — jamais renvoyer mot_de_passe_hash / secret 2FA. */
  toSafeProfile(utilisateur: Utilisateur): SafeUserProfile {
    return {
      id: utilisateur.id,
      cabinetId: utilisateur.cabinetId,
      nom: utilisateur.nom,
      email: utilisateur.email,
      role: utilisateur.role,
      permissions: (utilisateur.roleAcces as RoleAcces & { permissions?: string[] })?.permissions ?? [],
      authentif2faActif: utilisateur.authentif2faActif,
      actif: utilisateur.actif,
    };
  }

  /**
   * Enregistre ou met à jour le token Expo Push de l'appareil de l'utilisateur.
   * Silencieux si l'utilisateur est introuvable (évite les erreurs au boot).
   */
  async sauvegarderExpoPushToken(utilisateurId: number, expoPushToken: string): Promise<void> {
    await this.utilisateurRepository.update(
      { id: utilisateurId },
      { expoPushToken },
    );
  }
}
