import {
  IsArray, IsEnum, IsInt, IsNotEmpty,
  IsOptional, IsString, MaxLength,
} from 'class-validator';
import { DocumentConfidentialite } from '../entities/document.entity';

export class CreateDocumentDto {
  @IsString() @IsNotEmpty() @MaxLength(255)
  nom: string;

  @IsOptional() @IsInt()
  dossierId?: number;

  @IsOptional() @IsString() @MaxLength(100)
  typeDocument?: string;

  @IsOptional() @IsString() @MaxLength(500)
  cheminFichier?: string;

  @IsOptional() @IsInt()
  tailleKo?: number;

  @IsOptional()
  @IsEnum(DocumentConfidentialite, { message: 'confidentialite invalide : public | confidentiel | secret' })
  confidentialite?: DocumentConfidentialite;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];
}
