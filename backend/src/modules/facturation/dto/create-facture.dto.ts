import {
  IsDateString, IsInt, IsNotEmpty, IsNumber,
  IsOptional, IsPositive, IsString, MaxLength, Min,
} from 'class-validator';

export class CreateFactureDto {
  @IsInt()
  dossierId: number;

  @IsInt()
  clientId: number;

  @IsNumber() @IsPositive()
  montantHt: number;

  @IsOptional() @IsNumber() @Min(0)
  tauxTva?: number;

  @IsOptional() @IsDateString()
  dateEcheance?: string;

  @IsOptional() @IsString()
  description?: string;
}
