/**
 * backend/src/modules/users/users.service.ts — méthodes supplémentaires
 * Ajout des méthodes enregistrerEchecConnexion, reinitialiserEchecs et toSafeProfile
 * manquantes dans le fichier d'origine.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Utilisateur } from './entities/utilisateur.entity';
import { RoleAcces } from './entities/role-acces.entity';

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
      where: { email, deletedAt: undefined },
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

  /** Profil public sans champs sensibles (jamais renvoyer mot_de_passe_hash / secret 2FA). */
  toSafeProfile(utilisateur: Utilisateur): SafeUserProfile {
    return {
      id: utilisateur.id,
      cabinetId: utilisateur.cabinetId,
      nom: utilisateur.nom,
      email: utilisateur.email,
      role: utilisateur.role,
      permissions: (utilisateur.roleAcces as RoleAcces & { permissions?: string[] })?.permissions ?? [],
      authentif2faActif: utilisateur.authentif2faActif,
    };
  }
}
