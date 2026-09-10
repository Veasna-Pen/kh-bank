import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard, ROLES_KEY, RolesGuard } from '@app/auth';
import { AccountType, Currency, UserRole } from '@app/common/enums';
import type { IAuthenticatedUser } from '@app/common/interfaces/auth';
import { AccountServiceController } from './account-service.controller';
import { AccountServiceService } from './account-service.service';

const GUARDS_METADATA = '__guards__';

describe('AccountServiceController', () => {
  const reflector = new Reflector();
  const user: IAuthenticatedUser = {
    userId: 'user-1',
    phone: '+85512345678',
    deviceId: 'device-1',
    role: UserRole.USER,
  };
  const service = { createAccount: jest.fn() };
  let controller: AccountServiceController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AccountServiceController],
      providers: [{ provide: AccountServiceService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = app.get(AccountServiceController);
  });

  it('requires a JWT on every route', () => {
    expect(reflector.get(GUARDS_METADATA, AccountServiceController)).toEqual([
      JwtAuthGuard,
    ]);
  });

  it('restricts status changes to admins', () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const handler = AccountServiceController.prototype.updateStatus;

    expect(reflector.get(GUARDS_METADATA, handler)).toEqual([RolesGuard]);
    expect(reflector.get(ROLES_KEY, handler)).toEqual([UserRole.ADMIN]);
  });

  it('creates accounts for the authenticated user', async () => {
    const dto = {
      customerId: 'customer-1',
      type: AccountType.SAVINGS,
      currency: Currency.USD,
    };

    await controller.createAccount(user, dto);

    expect(service.createAccount).toHaveBeenCalledWith('user-1', dto);
  });
});
