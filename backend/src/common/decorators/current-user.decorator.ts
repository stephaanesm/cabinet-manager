/**
 * common/decorators/current-user.decorator.ts
 * ---------------------------------------------------------------------------
 * Raccourci pour récupérer l'utilisateur authentifié dans un contrôleur,
 * sans avoir à écrire `@Req() req` puis `req.user` à chaque fois.
 *
 * Exemple :
 *   @Get('me')
 *   getProfile(@CurrentUser() user: AuthenticatedUser) { return user; }
 * ---------------------------------------------------------------------------
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../interfaces/jwt-payload.interface';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
