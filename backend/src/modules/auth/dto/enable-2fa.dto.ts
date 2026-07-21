/**
 * modules/auth/dto/enable-2fa.dto.ts
 * ---------------------------------------------------------------------------
 * Utilisé pour CONFIRMER l'activation du 2FA : l'utilisateur doit prouver
 * qu'il a bien scanné le QR code et configuré son application (Google
 * Authenticator, etc.) en renvoyant un premier code TOTP valide avant que le
 * secret ne soit définitivement activé sur son compte.
 * ---------------------------------------------------------------------------
 */
import { IsString, Length } from 'class-validator';

export class Confirm2faDto {
  @IsString()
  @Length(6, 6, { message: 'Le code de vérification doit comporter exactement 6 chiffres.' })
  code: string;
}
