/**
 * modules/dossiers/dto/update-dossier.dto.ts
 * ---------------------------------------------------------------------------
 * Le statut n'est volontairement PAS modifiable via cette route générique :
 * la clôture d'un dossier passe exclusivement par POST /dossiers/{id}/cloturer
 * (voir dossiers.controller.ts) qui applique les règles de transition
 * valides. Cela évite qu'un PATCH générique ne court-circuite ces règles.
 * ---------------------------------------------------------------------------
 */
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDossierDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  titre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  juridiction?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  avocatResponsableId?: number;

  /**
   * Version connue par le client avant modification — utilisée pour le
   * contrôle de concurrence optimiste lors d'une synchronisation hors-ligne
   * (voir politique de synchronisation, section 3.4 : résolution des
   * conflits). Optionnel pour un appel direct depuis le web (toujours en
   * ligne, conflit peu probable), recommandé depuis le mobile.
   */
  @IsOptional()
  @IsInt()
  versionConnue?: number;
}
