import {
  IsDateString, IsNumber, IsOptional,
  IsPositive, IsString, MaxLength,
} from 'class-validator';

export class CreateEncaissementDto {
  @IsNumber() @IsPositive()
  montant: number;

  @IsOptional() @IsDateString()
  datePaiement?: string;

  @IsOptional() @IsString() @MaxLength(50)
  modePaiement?: string;

  @IsOptional() @IsString() @MaxLength(100)
  reference?: string;

  @IsOptional() @IsString()
  notes?: string;
}
