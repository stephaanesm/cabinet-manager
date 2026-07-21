/**
 * modules/auth/dto/login.dto.ts
 * ---------------------------------------------------------------------------
 * Les décorateurs class-validator ci-dessous sont vérifiés automatiquement
 * par le ValidationPipe global (voir main.ts) AVANT que le contrôleur ne soit
 * exécuté. Si un champ est invalide, Nest répond directement 400 avec le
 * détail — le contrôleur/service n'a donc jamais à re-vérifier ces règles.
 * ---------------------------------------------------------------------------
 */
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: "L'adresse email fournie n'est pas valide." })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est obligatoire.' })
  motDePasse: string;
}
