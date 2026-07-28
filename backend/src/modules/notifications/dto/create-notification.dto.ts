/**
 * backend/src/modules/notifications/dto/create-notification.dto.ts
 */

import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { NotificationType } from '../entities/notification.entity';
import { Type } from 'class-transformer';

export class CreateNotificationDto {
  @Type(() => Number)
  @IsInt()
  utilisateurId: number;

  @IsString()
  @IsNotEmpty()
  titre: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsString()
  entiteType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  entiteId?: number;
}
