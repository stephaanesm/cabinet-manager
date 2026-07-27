import {
  Body, Controller, Get, Param, ParseIntPipe,
  Patch, Post, Query,
} from '@nestjs/common';
import { FacturationService } from './facturation.service';
import { CreateFactureDto } from './dto/create-facture.dto';
import { UpdateFactureDto } from './dto/update-facture.dto';
import { QueryFacturesDto } from './dto/query-factures.dto';
import { CreateEncaissementDto } from './dto/create-encaissement.dto';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';

@Controller('factures')
export class FacturationController {
  constructor(private readonly svc: FacturationService) {}

  // ── Factures ──────────────────────────────────────────────────────────

  @RequirePermission('factures', 'create')
  @Post()
  createFacture(@Body() dto: CreateFactureDto, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.createFacture(dto, user);
  }

  @RequirePermission('factures', 'read')
  @Get()
  findAll(@Query() query: QueryFacturesDto, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.findAllFactures(query, user);
  }

  @RequirePermission('factures', 'read')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.findOneFacture(id, user);
  }

  @RequirePermission('factures', 'update')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFactureDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.updateFacture(id, dto, user);
  }

  @RequirePermission('factures', 'update')
  @Post(':id/envoyer')
  envoyer(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.envoyerFacture(id, user);
  }

  // ── Encaissements ─────────────────────────────────────────────────────

  @RequirePermission('factures', 'update')
  @Post(':id/encaissements')
  addEncaissement(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateEncaissementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.addEncaissement(id, dto, user);
  }

  @RequirePermission('factures', 'read')
  @Get(':id/encaissements')
  getEncaissements(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.getEncaissements(id, user);
  }
}
