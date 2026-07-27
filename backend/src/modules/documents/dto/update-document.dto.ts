import {
  IsArray, IsEnum, IsInt, IsOptional, IsString, MaxLength,
} from 'class-validator';
import { DocumentConfidentialite } from '../entities/document.entity';

export class UpdateDocumentDto {
  @IsOptional() @IsString() @MaxLength(255)
  nom?: string;

  @IsOptional() @IsString() @MaxLength(100)
  typeDocument?: string;

  @IsOptional() @IsString() @MaxLength(500)
  cheminFichier?: string;

  @IsOptional() @IsInt()
  tailleKo?: number;

  @IsOptional()
  @IsEnum(DocumentConfidentialite)
  confidentialite?: DocumentConfidentialite;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];
}
