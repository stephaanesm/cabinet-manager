/**
 * modules/auth/dto/verify-2fa.dto.ts
 * ---------------------------------------------------------------------------
 */
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class Verify2faDto {
  /**
   * Jeton "pré-2FA" à courte durée de vie (2 minutes) émis par /auth/login
   * quand l'utilisateur a le 2FA activé. Il prouve que l'identifiant/mot de
   * passe ont déjà été validés, sans pour autant donner accès à l'API.
   */
  @IsString()
  @IsNotEmpty({ message: 'Le jeton de pré-authentification est requis.' })
  preAuthToken: string;

  /** Code TOTP à 6 chiffres généré par l'application d'authentification. */
  @IsString()
  @Length(6, 6, { message: 'Le code de vérification doit comporter exactement 6 chiffres.' })
  code: string;
}
