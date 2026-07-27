import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { DocumentConfidentialite } from '../entities/document.entity';

export class QueryDocumentsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  pageSize: number = 20;

  @IsOptional() @Type(() => Number) @IsInt()
  dossierId?: number;

  @IsOptional() @IsString()
  typeDocument?: string;

  @IsOptional()
  @IsEnum(DocumentConfidentialite)
  confidentialite?: DocumentConfidentialite;

  @IsOptional() @IsString()
  search?: string;
}
