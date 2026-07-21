/**
 * modules/dossiers/dossiers.controller.ts
 * ---------------------------------------------------------------------------
 * Chaque route est décorée avec @RequirePermission('dossiers', <action>).
 * Le PermissionsGuard (global, voir auth.module.ts) résout la portée
 * (own/assigned/all) et l'attache à `request.permissionScope` ; on la
 * récupère ici via le décorateur @Scope() (voir plus bas) pour la transmettre
 * telle quelle au service, qui est seul responsable de l'appliquer à la
 * requête SQL.
 * ---------------------------------------------------------------------------
 */
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { DossiersService } from './dossiers.service';
import { CreateDossierDto } from './dto/create-dossier.dto';
import { UpdateDossierDto } from './dto/update-dossier.dto';
import { QueryDossiersDto } from './dto/query-dossiers.dto';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';
import { PermissionScope } from '../../common/rbac/permission.util';

/**
 * Petit décorateur local pour récupérer `request.permissionScope`, posé par
 * PermissionsGuard. Vit ici (plutôt que dans common/) car il est spécifique
 * au pattern "un guard pose une donnée de contexte, le contrôleur la lit" —
 * si d'autres modules en ont besoin à l'identique, le déplacer vers
 * common/decorators serait alors justifié.
 */
export const Scope = createParamDecorator((data: unknown, ctx: ExecutionContext): PermissionScope => {
  const request = ctx.switchToHttp().getRequest();
  return request.permissionScope;
});

@Controller('dossiers')
export class DossiersController {
  constructor(private readonly dossiersService: DossiersService) {}

  @RequirePermission('dossiers', 'create')
  @Post()
  async create(@Body() dto: CreateDossierDto, @CurrentUser() user: AuthenticatedUser) {
    return this.dossiersService.create(dto, user);
  }

  @RequirePermission('dossiers', 'read')
  @Get()
  async findAll(
    @Query() query: QueryDossiersDto,
    @CurrentUser() user: AuthenticatedUser,
    @Scope() scope: PermissionScope,
  ) {
    return this.dossiersService.findAll(query, user, scope);
  }

  @RequirePermission('dossiers', 'read')
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Scope() scope: PermissionScope,
  ) {
    return this.dossiersService.findOne(id, user, scope);
  }

  @RequirePermission('dossiers', 'update')
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDossierDto,
    @CurrentUser() user: AuthenticatedUser,
    @Scope() scope: PermissionScope,
  ) {
    return this.dossiersService.update(id, dto, user, scope);
  }

  @RequirePermission('dossiers', 'update')
  @Post(':id/cloturer')
  async cloturer(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Scope() scope: PermissionScope,
  ) {
    return this.dossiersService.cloturer(id, user, scope);
  }

  @RequirePermission('dossiers', 'read')
  @Get(':id/rentabilite')
  async rentabilite(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Scope() scope: PermissionScope,
  ) {
    return this.dossiersService.calculerRentabilite(id, user, scope);
  }
}
