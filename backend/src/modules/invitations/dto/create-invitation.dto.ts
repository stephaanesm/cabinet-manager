import { IsEmail, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateInvitationDto {
  @IsNumber()
  dossierId: number;

  @IsEmail()
  @IsNotEmpty()
  destinataireEmail: string;

  @IsString()
  @IsNotEmpty()
  motDePasse: string;
}
