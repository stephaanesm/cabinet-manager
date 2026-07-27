/**
 * backend/src/modules/users/users.controller.ts
 * Endpoints REST pour la gestion des utilisateurs par l'Administrateur.
 */
import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @RequirePermission('users', 'read')
  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findAll(user.cabinetId);
  }

  @RequirePermission('users', 'read')
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const u = await this.usersService.findById(id);
    return this.usersService.toSafeProfile(u);
  }

  @RequirePermission('users', 'update')
  @Patch(':id/activer')
  async activer(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.setActifStatus(id, user.cabinetId, true);
  }

  @RequirePermission('users', 'update')
  @Patch(':id/desactiver')
  async desactiver(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.setActifStatus(id, user.cabinetId, false);
  }
}
