/**
 * common/guards/permissions.guard.ts
 * ---------------------------------------------------------------------------
 * Garde RBAC "fine" : utilisée avec @RequirePermission('ressource','action').
 * Contrairement à RolesGuard (qui autorise/refuse en bloc), cette garde :
 *   1. Vérifie que l'utilisateur a AU MOINS une permission sur ressource/action
 *   2. Calcule la portée accordée (own / assigned / all)
 *   3. Attache cette portée à `request.permissionScope` pour que le service
 *      appelé ensuite sache s'il doit filtrer les résultats par propriétaire,
 *      par assignation, ou ne pas filtrer du tout.
 *
 * C'est cette dernière étape qui fait le lien entre le "cahier des charges"
 * ("un collaborateur ne voit que ses dossiers") et le code réel : le guard ne
 * fait QUE poser l'information de portée, c'est le DossiersService qui décide
 * comment l'appliquer à sa requête SQL (voir dossiers.service.ts).
 *
 * DÉBOGAGE : si un utilisateur reçoit un 403 inattendu, afficher
 * `user.permissions` (loggué ci-dessous en mode debug) et vérifier son rôle
 * dans la table roles_acces.
 * ---------------------------------------------------------------------------
 */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY, RequiredPermission } from '../decorators/permissions.decorator';
import { resolveScope } from '../rbac/permission.util';
import { AuthenticatedUser } from '../interfaces/jwt-payload.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RequiredPermission>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Pas de @RequirePermission sur cette route : rien à vérifier ici.
    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;

    if (!user) {
      throw new ForbiddenException({
        error: { code: 'FORBIDDEN', message: 'Utilisateur non authentifié.', status: 403 },
      });
    }

    const scope = resolveScope(user.permissions, required.resource, required.action);

    if (scope === null) {
      this.logger.debug(
        `Accès refusé : utilisateur ${user.id} sans permission "${required.resource}:${required.action}". ` +
          `Permissions actuelles : [${user.permissions.join(', ')}]`,
      );
      throw new ForbiddenException({
        error: {
          code: 'FORBIDDEN',
          message: `Permission manquante : ${required.resource}:${required.action}.`,
          status: 403,
        },
      });
    }

    // On attache la portée résolue à la requête pour que le contrôleur/service
    // sache filtrer ses résultats en conséquence (own / assigned / all).
    request.permissionScope = scope;

    return true;
  }
}
