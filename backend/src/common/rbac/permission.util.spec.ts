/**
 * common/rbac/permission.util.spec.ts
 * ---------------------------------------------------------------------------
 * Tests unitaires de la logique RBAC pure. Comme ces fonctions n'ont AUCUNE
 * dépendance externe, ces tests n'ont besoin d'aucun mock : c'est la première
 * chose à lancer en cas de bug RBAC ("l'utilisateur n'a pas accès alors qu'il
 * devrait") pour vérifier si le problème vient de la logique de résolution ou
 * d'ailleurs (données en base, guard, etc.).
 * ---------------------------------------------------------------------------
 */
import { parsePermission, resolveScope, hasPermission } from './permission.util';

describe('parsePermission', () => {
  it('découpe correctement une permission bien formée', () => {
    expect(parsePermission('dossiers:read:own')).toEqual({
      resource: 'dossiers',
      action: 'read',
      scope: 'own',
    });
  });

  it('retourne null si la portée est invalide', () => {
    expect(parsePermission('dossiers:read:everything')).toBeNull();
  });

  it('retourne null si le format a un nombre de segments incorrect', () => {
    expect(parsePermission('dossiers:read')).toBeNull();
    expect(parsePermission('dossiers:read:own:extra')).toBeNull();
  });
});

describe('resolveScope', () => {
  it('retourne la portée exacte quand une seule permission correspond', () => {
    const perms = ['dossiers:read:own'];
    expect(resolveScope(perms, 'dossiers', 'read')).toBe('own');
  });

  it('retourne null si aucune permission ne correspond à la ressource', () => {
    const perms = ['factures:read:own'];
    expect(resolveScope(perms, 'dossiers', 'read')).toBeNull();
  });

  it('retourne null si la ressource correspond mais pas l\'action', () => {
    const perms = ['dossiers:read:own'];
    expect(resolveScope(perms, 'dossiers', 'delete')).toBeNull();
  });

  it('accepte le joker "*" sur l\'action', () => {
    const perms = ['dossiers:*:own'];
    expect(resolveScope(perms, 'dossiers', 'delete')).toBe('own');
  });

  it('accepte le joker "*" sur la ressource', () => {
    const perms = ['*:read:all'];
    expect(resolveScope(perms, 'dossiers', 'read')).toBe('all');
  });

  it('traite "*:*:all" comme une super-permission universelle (Administrateur)', () => {
    const perms = ['*:*:all'];
    expect(resolveScope(perms, 'nimporte_quoi', 'nimporte_action')).toBe('all');
  });

  it('retient la portée la plus large en cas de permissions cumulées', () => {
    // Un utilisateur pourrait cumuler un rôle "own" et un rôle "all" ;
    // la règle métier veut que la portée la plus permissive gagne.
    const perms = ['dossiers:read:own', 'dossiers:read:all'];
    expect(resolveScope(perms, 'dossiers', 'read')).toBe('all');
  });

  it('ignore silencieusement une permission mal formée sans planter', () => {
    const perms = ['ceci_est_invalide', 'dossiers:read:own'];
    expect(resolveScope(perms, 'dossiers', 'read')).toBe('own');
  });

  it('retourne null pour une liste de permissions vide', () => {
    expect(resolveScope([], 'dossiers', 'read')).toBeNull();
  });
});

describe('hasPermission', () => {
  it('retourne true si une permission correspond, peu importe la portée', () => {
    expect(hasPermission(['audiences:create:assigned'], 'audiences', 'create')).toBe(true);
  });

  it('retourne false si aucune permission ne correspond', () => {
    expect(hasPermission(['audiences:create:assigned'], 'factures', 'create')).toBe(false);
  });
});
