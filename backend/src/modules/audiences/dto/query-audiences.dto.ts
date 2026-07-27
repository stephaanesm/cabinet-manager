import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsDateString, Min } from 'class-validator';
import { AudienceStatut } from '../entities/audience.entity';

export class QueryAudiencesDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  pageSize: number = 20;

  @IsOptional() @Type(() => Number) @IsInt()
  dossierId?: number;

  @IsOptional()
  @IsEnum(AudienceStatut)
  statut?: AudienceStatut;

  @IsOptional() @IsDateString()
  dateDebut?: string;

  @IsOptional() @IsDateString()
  dateFin?: string;
}
