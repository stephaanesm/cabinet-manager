/**
 * backend/src/modules/auth/dto/register.dto.ts
 * DTO pour l'inscription d'un Avocat depuis l'application mobile.
 */
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { RoleLibelle } from '../../users/entities/role-acces.entity';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom est obligatoire.' })
  nom: string;

  @IsString()
  @IsOptional()
  prenom?: string;

  @IsEmail({}, { message: "L'adresse email fournie n'est pas valide." })
  email: string;

  @IsString()
  @IsOptional()
  telephone?: string;

  @IsString()
  @IsOptional()
  dateNaissance?: string;

  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit comporter au moins 6 caractères.' })
  motDePasse: string;

  @IsOptional()
  role?: RoleLibelle = RoleLibelle.AVOCAT;
}
