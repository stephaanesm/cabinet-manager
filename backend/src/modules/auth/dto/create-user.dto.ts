/**
 * modules/auth/dto/create-user.dto.ts
 * ---------------------------------------------------------------------------
 * Il n'existe volontairement PAS de route d'auto-inscription publique : dans
 * un cabinet d'avocats, les comptes sont créés par un Administrateur (voir
 * cahier des charges, section "Exigences Administrateur — Gestion des rôles
 * et habilitations"). Ce DTO est donc utilisé par POST /users, une route
 * protégée par @Roles('Administrateur').
 * ---------------------------------------------------------------------------
 */
import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { RoleLibelle } from '../../users/entities/role-acces.entity';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom est obligatoire.' })
  nom: string;

  @IsEmail({}, { message: "L'adresse email fournie n'est pas valide." })
  email: string;

  /**
   * Mot de passe temporaire fourni par l'administrateur (l'utilisateur sera
   * invité à le changer à la première connexion — non implémenté dans ce
   * module, à prévoir dans le module Profil utilisateur).
   * Règle de complexité alignée sur les spécifications de sécurité (4.7) :
   * au moins 10 caractères. Les autres règles (majuscule/chiffre/spécial)
   * sont vérifiées par PasswordPolicyService (voir auth.service.ts).
   */
  @IsString()
  @MinLength(10, { message: 'Le mot de passe doit comporter au moins 10 caractères.' })
  motDePasse: string;

  @IsEnum(RoleLibelle, { message: 'Rôle invalide.' })
  role: RoleLibelle;

  @IsInt()
  roleAccesId: number;
}
