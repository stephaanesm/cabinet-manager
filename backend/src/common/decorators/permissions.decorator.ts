/**
 * common/decorators/permissions.decorator.ts
 * ---------------------------------------------------------------------------
 * Décorateur RBAC "fin" basé sur le format défini dans les spécifications de
 * sécurité :   ressource:action:portée   (ex. "dossiers:read:own").
 *
 * On ne décore la route qu'avec ressource + action (ex. 'dossiers', 'read') ;
 * la PORTÉE (own / assigned / all) est déterminée dynamiquement par le
 * PermissionsGuard en comparant avec les permissions réelles de l'utilisateur,
 * puis exposée à la couche service via `request.permissionScope` afin que le
 * service applique le bon filtre SQL (WHERE avocat_id = ... par exemple).
 *
 * Exemple :
 *   @RequirePermission('dossiers', 'read')
 *   @Get()
 *   findAll(@CurrentUser() user, @Req() req) {
 *     // req.permissionScope vaut 'own' | 'assigned' | 'all'
 *   }
 * ---------------------------------------------------------------------------
 */
import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'requiredPermission';

export interface RequiredPermission {
  resource: string;
  action: string;
}

export const RequirePermission = (resource: string, action: string) =>
  SetMetadata(PERMISSION_KEY, { resource, action } as RequiredPermission);
