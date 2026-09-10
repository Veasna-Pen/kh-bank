import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard, ROLES_KEY, RolesGuard } from '@app/auth';
import { UserRole } from '@app/common/enums';
import type { IAuthenticatedUser } from '@app/common/interfaces/auth';
import { CustomerServiceController } from './customer-service.controller';
import { CustomerServiceService } from './customer-service.service';

const GUARDS_METADATA = '__guards__';

describe('CustomerServiceController', () => {
  const reflector = new Reflector();
  const user: IAuthenticatedUser = {
    userId: 'user-1',
    phone: '+85512345678',
    deviceId: 'device-1',
    role: UserRole.USER,
  };
  const service = { getMe: jest.fn() };
  let controller: CustomerServiceController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const app: TestingModule = await Test.createTestingModule({
      controllers: [CustomerServiceController],
      providers: [{ provide: CustomerServiceService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = app.get(CustomerServiceController);
  });

  describe.each(['getCustomerById', 'updateKycStatus'] as const)(
    '%s',
    (method) => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const handler = CustomerServiceController.prototype[method];

      it('is restricted to authenticated admins', () => {
        expect(reflector.get(GUARDS_METADATA, handler)).toEqual([
          JwtAuthGuard,
          RolesGuard,
        ]);
        expect(reflector.get(ROLES_KEY, handler)).toEqual([UserRole.ADMIN]);
      });
    },
  );

  it('getMe looks up the authenticated user', async () => {
    service.getMe.mockResolvedValue({ customer: { id: 'customer-1' } });

    await expect(controller.getMe(user)).resolves.toEqual({
      customer: { id: 'customer-1' },
    });
    expect(service.getMe).toHaveBeenCalledWith('user-1');
  });
});
