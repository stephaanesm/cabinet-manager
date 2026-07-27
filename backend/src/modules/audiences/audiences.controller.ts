import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseIntPipe, Patch, Post, Query,
} from '@nestjs/common';
import { AudiencesService } from './audiences.service';
import { CreateAudienceDto } from './dto/create-audience.dto';
import { UpdateAudienceDto } from './dto/update-audience.dto';
import { QueryAudiencesDto } from './dto/query-audiences.dto';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';

@Controller('audiences')
export class AudiencesController {
  constructor(private readonly svc: AudiencesService) {}

  @RequirePermission('audiences', 'create')
  @Post()
  create(@Body() dto: CreateAudienceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.create(dto, user);
  }

  @RequirePermission('audiences', 'read')
  @Get()
  findAll(@Query() query: QueryAudiencesDto, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.findAll(query, user);
  }

  @RequirePermission('audiences', 'read')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.findOne(id, user);
  }

  @RequirePermission('audiences', 'update')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAudienceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.update(id, dto, user);
  }

  @RequirePermission('audiences', 'update')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.remove(id, user);
  }
}
