import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { FactureStatut } from '../entities/facture.entity';

export class QueryFacturesDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  pageSize: number = 20;

  @IsOptional() @Type(() => Number) @IsInt()
  dossierId?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  clientId?: number;

  @IsOptional()
  @IsEnum(FactureStatut)
  statut?: FactureStatut;
}
