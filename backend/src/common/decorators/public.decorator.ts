/**
 * common/decorators/public.decorator.ts
 * ---------------------------------------------------------------------------
 * Marque une route comme publique (pas de JWT requis), par exemple
 * POST /auth/login. Le JwtAuthGuard global vérifie ce métadonnée avant de
 * refuser une requête sans jeton.
 *
 * Exemple d'utilisation :
 *   @Public()
 *   @Post('login')
 *   login(@Body() dto: LoginDto) { ... }
 * ---------------------------------------------------------------------------
 */
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
