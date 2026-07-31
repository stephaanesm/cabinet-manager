/**
 * backend/src/modules/sync/dto/batch-sync.dto.ts
 * DTOs pour la synchronisation par lots (batch) et la résolution des conflits hors-ligne.
 */

import { IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum ActionSync {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

export enum EntiteSync {
  DOSSIER  = 'dossier',
  AUDIENCE = 'audience',
  FACTURE  = 'facture',
  DOCUMENT = 'document',
}

export class BatchSyncItemDto {
  @IsString()
  @IsNotEmpty()
  clientId: string; // UUID temporaire client

  @IsEnum(EntiteSync)
  entiteType: EntiteSync;

  @IsEnum(ActionSync)
  action: ActionSync;

  @IsNotEmpty()
  payload: Record<string, any>;

  @IsOptional()
  @IsInt()
  versionConnue?: number;

  @IsOptional()
  @IsString()
  horodatageLocal?: string;
}

export class BatchSyncRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchSyncItemDto)
  mutations: BatchSyncItemDto[];

  @IsOptional()
  @IsString()
  dernierTimestampSync?: string;
}
