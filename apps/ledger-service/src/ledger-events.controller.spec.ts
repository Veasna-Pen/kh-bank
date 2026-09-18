import { Test, TestingModule } from '@nestjs/testing';
import { Currency } from '@app/common/enums';
import type { ITransferCreatedEvent } from '@app/common/interfaces/events';
import { LedgerEventsController } from './ledger-events.controller';
import { LedgerServiceService } from './ledger-service.service';

describe('LedgerEventsController', () => {
  let controller: LedgerEventsController;
  const ledgerService = {
    processTransfer: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LedgerEventsController],
      providers: [{ provide: LedgerServiceService, useValue: ledgerService }],
    }).compile();

    controller = module.get<LedgerEventsController>(LedgerEventsController);
  });

  it('delegates transfer.created events to processTransfer', async () => {
    const event: ITransferCreatedEvent = {
      eventId: 'evt-1',
      eventType: 'transfer.created',
      version: 1,
      occurredAt: new Date().toISOString(),
      source: 'transfer-service',
      data: {
        transferId: 'tr-1',
        reference: 'TRX-123',
        fromAccountId: 'acc-1',
        toAccountId: 'acc-2',
        amount: '100.00',
        currency: Currency.USD,
        createdAt: new Date().toISOString(),
      },
    };

    await controller.handleTransferCreated(event);
    expect(ledgerService.processTransfer).toHaveBeenCalledWith(event);
  });
});
