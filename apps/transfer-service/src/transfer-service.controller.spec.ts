import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '@app/auth';
import { Currency, UserRole } from '@app/common/enums';
import type { IAuthenticatedUser } from '@app/common/interfaces/auth';
import { TransferServiceController } from './transfer-service.controller';
import { TransferServiceService } from './transfer-service.service';

const GUARDS_METADATA = '__guards__';

describe('TransferServiceController', () => {
  const reflector = new Reflector();
  const user: IAuthenticatedUser = {
    userId: 'user-1',
    phone: '+85512345678',
    deviceId: 'device-1',
    role: UserRole.USER,
  };
  const dto = {
    fromAccountId: 'account-1',
    toAccountId: 'account-2',
    amount: '100.50',
    currency: Currency.USD,
  };
  const service = { createTransfer: jest.fn() };
  let controller: TransferServiceController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const app: TestingModule = await Test.createTestingModule({
      controllers: [TransferServiceController],
      providers: [{ provide: TransferServiceService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = app.get(TransferServiceController);
  });

  it('requires a JWT on every route', () => {
    expect(reflector.get(GUARDS_METADATA, TransferServiceController)).toEqual([
      JwtAuthGuard,
    ]);
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['blank', '   '],
    ['too long', 'k'.repeat(256)],
  ])('rejects a %s Idempotency-Key', async (_label, key) => {
    await expect(controller.createTransfer(user, key, dto)).rejects.toThrow(
      BadRequestException,
    );
    expect(service.createTransfer).not.toHaveBeenCalled();
  });

  it('passes the trimmed Idempotency-Key to the service', async () => {
    await controller.createTransfer(user, '  key-1  ', dto);

    expect(service.createTransfer).toHaveBeenCalledWith('user-1', 'key-1', dto);
  });
});
