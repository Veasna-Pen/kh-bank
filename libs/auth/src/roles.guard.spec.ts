import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@app/common/enums';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  const contextWith = (user?: { role?: UserRole }) =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  const requireRoles = (roles: UserRole[] | undefined) =>
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);

  afterEach(() => jest.restoreAllMocks());

  it('allows a user holding a required role', () => {
    requireRoles([UserRole.ADMIN]);
    expect(guard.canActivate(contextWith({ role: UserRole.ADMIN }))).toBe(true);
  });

  it('rejects a user without the required role', () => {
    requireRoles([UserRole.ADMIN]);
    expect(() =>
      guard.canActivate(contextWith({ role: UserRole.USER })),
    ).toThrow(ForbiddenException);
  });

  it('rejects a token issued before roles existed', () => {
    requireRoles([UserRole.ADMIN]);
    expect(() => guard.canActivate(contextWith({}))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects when there is no authenticated user', () => {
    requireRoles([UserRole.ADMIN]);
    expect(() => guard.canActivate(contextWith(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('fails closed when the route has no @Roles()', () => {
    requireRoles(undefined);
    expect(() =>
      guard.canActivate(contextWith({ role: UserRole.ADMIN })),
    ).toThrow(ForbiddenException);
  });
});
