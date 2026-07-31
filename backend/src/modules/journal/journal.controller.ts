/**
 * backend/src/modules/journal/journal.controller.ts
 * Controller REST d'administration du journal d'activité et de traçabilité (Audit Trail).
 */

import {
  Controller, Get, Param, ParseIntPipe, Post, Query,
} from '@nestjs/common';
import { JournalService, QueryJournalDto } from './journal.service';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';

@Controller('journal')
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @RequirePermission('journal', 'read')
  @Get()
  findAll(
    @Query() query: QueryJournalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.journalService.findAll(query, user);
  }

  @RequirePermission('journal', 'read')
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.journalService.findOne(id, user);
  }

  @RequirePermission('journal', 'update')
  @Post(':id/restaurer')
  restaurer(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.journalService.restaurer(id, user);
  }
}
