import {
  IsDateString, IsEnum, IsInt, IsNotEmpty,
  IsOptional, IsString, MaxLength,
} from 'class-validator';
import { AudienceStatut } from '../entities/audience.entity';

import { Type } from 'class-transformer';

export class CreateAudienceDto {
  @Type(() => Number)
  @IsInt()
  dossierId: number;

  @IsDateString()
  dateAudience: string;

  @IsOptional() @IsString() @MaxLength(10)
  heure?: string;

  @IsOptional() @IsString() @MaxLength(150)
  juridiction?: string;

  @IsOptional() @IsString() @MaxLength(100)
  salle?: string;

  @IsOptional() @IsString() @MaxLength(100)
  typeAudience?: string;

  @IsOptional()
  @IsEnum(AudienceStatut, { message: 'Statut invalide : prevue | tenue | renvoyee' })
  statut?: AudienceStatut;

  @IsOptional() @IsString()
  notes?: string;
}
