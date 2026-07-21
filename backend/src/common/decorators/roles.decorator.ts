/**
 * common/decorators/roles.decorator.ts
 * ---------------------------------------------------------------------------
 * Décorateur RBAC "simple" : restreint une route à une liste de rôles nommés.
 * À utiliser pour les routes d'administration où le contrôle par simple rôle
 * suffit (ex. gestion des utilisateurs = Administrateur uniquement).
 *
 * Pour un contrôle plus fin par ressource/action/portée, voir
 * @RequirePermission (permissions.decorator.ts) qui s'appuie sur la matrice
 * RBAC définie dans les spécifications de sécurité.
 *
 * Exemple :
 *   @Roles('Administrateur')
 *   @Get('users')
 *   listUsers() { ... }
 * ---------------------------------------------------------------------------
 */
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
