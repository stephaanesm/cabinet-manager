/**
 * backend/src/modules/auth/dto/register.dto.ts
 * ---------------------------------------------------------------------------
 * DTO pour l'auto-inscription d'un utilisateur depuis l'application mobile.
 * Contrairement à CreateUserDto (réservé aux admins), ce DTO :
 *   - Ne requiert pas de roleAccesId (le rôle est choisi parmi les disponibles)
 *   - Marque le compte comme inactif (actif = false) jusqu'à activation admin
 *   - N'exige pas de cabinetId (fourni via header X-Cabinet-ID ou param)
 *
 * Règles de mot de passe (alignées sur les spécifications de sécurité 4.7) :
 *   - 8 caractères minimum
 *   - Au moins 1 majuscule et 1 chiffre (vérifiés dans AuthService.register())
 * ---------------------------------------------------------------------------
 */
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { RoleLibelle } from '../../users/entities/role-acces.entity';

/** Rôles autorisés pour l'auto-inscription (Administrateur exclu). */
const ROLES_INSCRIPTION: RoleLibelle[] = [
  RoleLibelle.AVOCAT,
  RoleLibelle.ASSISTANT,
  RoleLibelle.ASSOCIE,
];

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom complet est obligatoire.' })
  nom: string;

  @IsEmail({}, { message: "L'adresse email fournie n'est pas valide." })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit comporter au moins 8 caractères.' })
  motDePasse: string;

  /**
   * Rôle demandé par l'utilisateur. Administrateur interdit ici —
   * la vérification double est faite dans AuthService.register().
   */
  @IsIn(ROLES_INSCRIPTION, {
    message: `Rôle invalide. Valeurs acceptées : ${ROLES_INSCRIPTION.join(', ')}.`,
  })
  role: RoleLibelle;
}

