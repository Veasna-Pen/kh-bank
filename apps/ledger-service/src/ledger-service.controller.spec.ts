import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard, RolesGuard } from '@app/auth';
import { Currency } from '@app/common/enums';
import { LedgerServiceController } from './ledger-service.controller';
import { LedgerServiceService } from './ledger-service.service';

describe('LedgerServiceController', () => {
  let controller: LedgerServiceController;
  const service = {
    deposit: jest.fn(),
    getAccountBalance: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LedgerServiceController],
      providers: [{ provide: LedgerServiceService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<LedgerServiceController>(LedgerServiceController);
  });

  it('should call deposit service with dto', async () => {
    const dto = {
      accountId: '11111111-1111-1111-1111-111111111111',
      amount: '500.0000',
      currency: Currency.USD,
      description: 'Initial deposit',
    };
    service.deposit.mockResolvedValue({
      message: 'Deposit recorded successfully',
    });

    const result = await controller.deposit(dto);
    expect(service.deposit).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ message: 'Deposit recorded successfully' });
  });

  it('should call getAccountBalance service', async () => {
    service.getAccountBalance.mockResolvedValue({
      accountId: '11111111-1111-1111-1111-111111111111',
      balance: '500.0000',
      currency: Currency.USD,
    });

    const result = await controller.getAccountBalance(
      '11111111-1111-1111-1111-111111111111',
      Currency.USD,
    );
    expect(service.getAccountBalance).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
      Currency.USD,
    );
    expect(result).toEqual({
      accountId: '11111111-1111-1111-1111-111111111111',
      balance: '500.0000',
      currency: Currency.USD,
    });
  });
});
