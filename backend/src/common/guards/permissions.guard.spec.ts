/**
 * common/guards/permissions.guard.spec.ts
 * ---------------------------------------------------------------------------
 */
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

function buildMockContext(user: any, request: any = {}) {
  const req = { user, ...request };
  const ctx = {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
  return { ctx, req };
}

describe('PermissionsGuard', () => {
  let reflector: Reflector;
  let guard: PermissionsGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  it('laisse passer si la route ne déclare aucune permission requise', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const { ctx } = buildMockContext({ permissions: [] });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("attache la portée résolue ('own') à la requête quand l'accès est autorisé", () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ resource: 'dossiers', action: 'read' });
    const { ctx, req } = buildMockContext({ permissions: ['dossiers:read:own'] });

    const result = guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(req.permissionScope).toBe('own');
  });

  it("attache la portée 'all' pour un administrateur avec la super-permission", () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ resource: 'dossiers', action: 'delete' });
    const { ctx, req } = buildMockContext({ permissions: ['*:*:all'] });

    guard.canActivate(ctx);

    expect(req.permissionScope).toBe('all');
  });

  it("refuse (403) si l'utilisateur n'a aucune permission correspondante", () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ resource: 'factures', action: 'delete' });
    const { ctx } = buildMockContext({ permissions: ['dossiers:read:own'] });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it("refuse si aucun utilisateur n'est présent sur la requête", () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ resource: 'dossiers', action: 'read' });
    const { ctx } = buildMockContext(undefined);

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
