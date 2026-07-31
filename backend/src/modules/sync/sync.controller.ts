/**
 * backend/src/modules/sync/sync.controller.ts
 * Endpoints REST pour la synchronisation hors-ligne par lots et la réconciliation.
 */

import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { SyncService } from './sync.service';
import { BatchSyncRequestDto } from './dto/batch-sync.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('batch')
  traiterBatch(
    @Body() dto: BatchSyncRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.syncService.traiterLotMutations(dto, user);
  }

  @Get('delta')
  obtenirDeltas(
    @Query('depuis') depuis: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.syncService.obtenirDeltas(depuis, user);
  }
}
