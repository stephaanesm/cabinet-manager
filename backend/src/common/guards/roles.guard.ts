/**
 * common/guards/roles.guard.ts
 * ---------------------------------------------------------------------------
 * Garde RBAC "simple" : vérifie que le rôle de l'utilisateur authentifié fait
 * partie de la liste autorisée par @Roles(...) sur la route.
 *
 * S'exécute APRÈS JwtAuthGuard (donc `request.user` est déjà renseigné).
 * Si la route ne porte pas @Roles(...), la garde laisse passer (elle ne
 * s'applique que là où elle est explicitement demandée).
 * ---------------------------------------------------------------------------
 */
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedUser } from '../interfaces/jwt-payload.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Pas de restriction de rôle déclarée sur cette route : on laisse passer.
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;

    if (!user) {
      // Ne devrait jamais arriver si JwtAuthGuard s'exécute avant celle-ci,
      // mais on reste défensif plutôt que de lever une NullPointer obscure.
      throw new ForbiddenException({
        error: { code: 'FORBIDDEN', message: 'Utilisateur non authentifié.', status: 403 },
      });
    }

    const autorise = requiredRoles.includes(user.role);
    if (!autorise) {
      throw new ForbiddenException({
        error: {
          code: 'FORBIDDEN',
          message: `Rôle "${user.role}" non autorisé pour cette action. Rôles requis : ${requiredRoles.join(', ')}.`,
          status: 403,
        },
      });
    }

    return true;
  }
}
