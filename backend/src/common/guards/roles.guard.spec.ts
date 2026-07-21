/**
 * common/guards/roles.guard.spec.ts
 * ---------------------------------------------------------------------------
 * On simule un ExecutionContext Nest "à la main" (mockExecutionContext) plutôt
 * que de démarrer une vraie application HTTP : c'est beaucoup plus rapide et
 * cela isole le test de tout comportement réseau. C'est le pattern à
 * réutiliser pour tester n'importe quel autre guard du projet.
 * ---------------------------------------------------------------------------
 */
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';

function buildMockContext(user: any): ExecutionContext {
  const request = { user };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it("laisse passer si la route ne déclare aucun rôle requis", () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = buildMockContext({ role: 'Assistant' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('autorise un utilisateur dont le rôle fait partie de la liste requise', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['Administrateur', 'Associe']);
    const ctx = buildMockContext({ role: 'Associe' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("refuse (403) un utilisateur dont le rôle n'est pas autorisé", () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['Administrateur']);
    const ctx = buildMockContext({ role: 'Avocat' });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it("refuse si aucun utilisateur n'est présent sur la requête (garde défensive)", () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['Administrateur']);
    const ctx = buildMockContext(undefined);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('utilise bien la clé de métadonnée ROLES_KEY attendue', () => {
    const spy = jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = buildMockContext({ role: 'Avocat' });
    guard.canActivate(ctx);
    expect(spy).toHaveBeenCalledWith(ROLES_KEY, expect.any(Array));
  });
});
