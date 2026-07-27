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
import { RegisterDto } from './dto/register.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── Connexion ─────────────────────────────────────────────────────────────

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: { email: string; motDePasse: string },
    @Req() req: Request,
  ) {
    const appareilId = (req.headers['x-device-id'] as string) ?? 'unknown';
    return this.authService.login(body.email, body.motDePasse, appareilId);
  }

  // ── Inscription publique ──────────────────────────────────────────────────
  /**
   * POST /api/v1/auth/register
   * Crée un compte utilisateur inactif (actif = false).
   * Corps attendu : { nom, email, motDePasse, role }
   * Retourne 201 avec { message, user } en cas de succès.
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register({
      nom: dto.nom,
      email: dto.email,
      motDePasse: dto.motDePasse,
      role: dto.role,
    });
  }

  // ── Refresh token ─────────────────────────────────────────────────────────

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() body: { refreshToken: string },
    @Req() req: Request,
  ) {
    const appareilId = (req.headers['x-device-id'] as string) ?? 'unknown';
    return this.authService.refresh(body.refreshToken, appareilId);
  }

  // ── Déconnexion ───────────────────────────────────────────────────────────

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() body: { refreshToken: string }) {
    await this.authService.logout(body.refreshToken);
  }

  // ── Profil courant ────────────────────────────────────────────────────────

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.id);
  }
}
