/**
 * backend/src/modules/auth/auth.controller.ts (à compléter)
 * Endpoints REST du module Authentification.
 * Voir spec OpenAPI : POST /auth/login, /auth/refresh, /auth/logout,
 * /auth/me, /auth/2fa/enable, /auth/2fa/verify
 */
import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: { email: string; motDePasse: string },
    @Req() req: Request,
  ) {
    const appareilId = req.headers['x-device-id'] as string ?? 'unknown';
    return this.authService.login(body.email, body.motDePasse, appareilId);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() body: { refreshToken: string },
    @Req() req: Request,
  ) {
    const appareilId = req.headers['x-device-id'] as string ?? 'unknown';
    return this.authService.refresh(body.refreshToken, appareilId);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() body: { refreshToken: string }) {
    await this.authService.logout(body.refreshToken);
  }

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.id);
  }
}
