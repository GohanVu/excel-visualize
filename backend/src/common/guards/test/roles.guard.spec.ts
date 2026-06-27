import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from '../roles.guard';
import { Role } from '@prisma/client';

function mockContext(user: { role: Role } | null, handler = jest.fn(), cls = jest.fn()) {
  return {
    getHandler: () => handler,
    getClass: () => cls,
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('allows access when no roles metadata set', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(mockContext(null))).toBe(true);
  });

  it('allows admin to access admin-only route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.admin]);
    expect(guard.canActivate(mockContext({ role: Role.admin }))).toBe(true);
  });

  it('blocks user from admin-only route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.admin]);
    expect(guard.canActivate(mockContext({ role: Role.user }))).toBe(false);
  });

  it('allows user to access user route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.user]);
    expect(guard.canActivate(mockContext({ role: Role.user }))).toBe(true);
  });

  it('blocks when user is null', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.admin]);
    expect(guard.canActivate(mockContext(null))).toBe(false);
  });
});
