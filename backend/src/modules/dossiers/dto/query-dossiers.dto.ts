/**
 * modules/dossiers/dto/query-dossiers.dto.ts
 * ---------------------------------------------------------------------------
 * Filtres de recherche pour GET /dossiers, alignés sur la spécification
 * OpenAPI (paramètres statut, avocat_id, juridiction, pagination).
 *
 * @Type(() => Number) est nécessaire car les query params HTTP arrivent
 * toujours sous forme de chaînes de caractères ; sans cette transformation,
 * class-validator rejetterait "page=2" comme n'étant pas un nombre.
 * ---------------------------------------------------------------------------
 */
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { DossierStatut } from '../entities/dossier.entity';

export class QueryDossiersDto {
  @IsOptional()
  @IsEnum(DossierStatut)
  statut?: DossierStatut;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  avocatId?: number;

  @IsOptional()
  @IsString()
  juridiction?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}
