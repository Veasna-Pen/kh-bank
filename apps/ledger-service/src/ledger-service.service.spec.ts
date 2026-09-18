import { BadRequestException } from '@nestjs/common';
import {
  Currency,
  LedgerTransactionStatus,
  LedgerTransactionType,
} from '@app/common/enums';
import type {
  ITransferCompletedEvent,
  ITransferCreatedEvent,
  ITransferFailedEvent,
} from '@app/common/interfaces/events';
import { of } from 'rxjs';
import { EVENT_SOURCES, EventPublisher, KAFKA_TOPICS } from '@app/kafka';
import { LedgerServiceService, toScaledBigInt } from './ledger-service.service';

function createFakeLedgerDb() {
  const selectResults: unknown[][] = [];
  const query = {
    from: () => query,
    where: () => query,
    limit: () => Promise.resolve(selectResults.shift() ?? []),
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve(selectResults.shift() ?? []).then(resolve),
  };

  const insertedRows: Record<string, unknown>[] = [];
  const tx = {
    execute: jest.fn().mockResolvedValue(undefined),
    select: () => ({
      from: () => ({
        where: () => Promise.resolve(selectResults.shift() ?? []),
      }),
    }),
    insert: () => ({
      values: (rows: Record<string, unknown> | Record<string, unknown>[]) => {
        if (Array.isArray(rows)) {
          insertedRows.push(...rows);
        } else {
          insertedRows.push(rows);
        }
        return {
          returning: () => Promise.resolve(Array.isArray(rows) ? rows : [rows]),
        };
      },
    }),
  };

  const db = {
    select: () => query,
    transaction: jest.fn((fn: (t: typeof tx) => unknown) =>
      Promise.resolve(fn(tx)),
    ),
  };

  return { db, tx, selectResults, insertedRows };
}

describe('toScaledBigInt', () => {
  it('correctly converts decimals to 4-decimal scaled BigInt', () => {
    expect(toScaledBigInt('100')).toBe(1000000n);
    expect(toScaledBigInt('100.5')).toBe(1005000n);
    expect(toScaledBigInt('100.5555')).toBe(1005555n);
    expect(toScaledBigInt('0.0001')).toBe(1n);
    expect(toScaledBigInt('0')).toBe(0n);
    expect(toScaledBigInt('-50.25')).toBe(-502500n);
  });
});

describe('LedgerServiceService', () => {
  let fake: ReturnType<typeof createFakeLedgerDb>;
  let kafka: { emit: jest.Mock };
  let service: LedgerServiceService;

  beforeEach(() => {
    fake = createFakeLedgerDb();
    kafka = { emit: jest.fn(() => of(undefined)) };
    service = new LedgerServiceService(
      { db: fake.db } as any,
      new EventPublisher(kafka as any, EVENT_SOURCES.LEDGER_SERVICE),
    );
  });

  describe('deposit', () => {
    it('rejects zero or negative deposit amount', async () => {
      await expect(
        service.deposit({
          accountId: '11111111-1111-1111-1111-111111111111',
          amount: '0',
          currency: Currency.USD,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a double-entry deposit transaction', async () => {
      const result = await service.deposit({
        accountId: '11111111-1111-1111-1111-111111111111',
        amount: '250.0000',
        currency: Currency.USD,
        description: 'Initial funding',
      });

      expect(result.message).toBe('Deposit recorded successfully');
      expect(fake.db.transaction).toHaveBeenCalled();
      expect(fake.insertedRows.length).toBe(3); // 1 transaction + 2 entries
      const entries = fake.insertedRows.slice(1);
      expect(entries[0]).toMatchObject({
        direction: 'DEBIT',
        amount: '250.0000',
        currency: Currency.USD,
      });
      expect(entries[1]).toMatchObject({
        direction: 'CREDIT',
        amount: '250.0000',
        currency: Currency.USD,
        accountId: '11111111-1111-1111-1111-111111111111',
      });
    });
  });

  describe('getAccountBalance', () => {
    it('returns calculated balance', async () => {
      fake.selectResults.push([{ balance: '350.0000' }]);

      const balance = await service.getAccountBalance(
        '11111111-1111-1111-1111-111111111111',
        Currency.USD,
      );

      expect(balance).toEqual({
        accountId: '11111111-1111-1111-1111-111111111111',
        balance: '350.0000',
        currency: Currency.USD,
      });
    });
  });

  describe('processTransfer', () => {
    const event: ITransferCreatedEvent = {
      eventId: 'evt-100',
      eventType: 'transfer.created',
      version: 1,
      occurredAt: new Date().toISOString(),
      source: 'transfer-service',
      data: {
        transferId: 'tr-100',
        reference: 'TRX-100',
        fromAccountId: 'acc-from',
        toAccountId: 'acc-to',
        amount: '100.0000',
        currency: Currency.USD,
        createdAt: new Date().toISOString(),
      },
    };

    it('skips event if already processed', async () => {
      fake.selectResults.push([{ id: 'p-1', eventId: 'evt-100' }]);

      await service.processTransfer(event);

      expect(fake.db.transaction).not.toHaveBeenCalled();
      expect(kafka.emit).not.toHaveBeenCalled();
    });

    it('fails transfer and emits transfer.failed when funds are insufficient', async () => {
      // 1. Fast check: not processed yet
      fake.selectResults.push([]);
      // 2. Tx balance query: only 50.0000 balance
      fake.selectResults.push([{ balance: '50.0000' }]);

      await service.processTransfer(event);

      expect(fake.tx.execute).toHaveBeenCalled(); // advisory lock
      // Should emit transfer.processing then transfer.failed
      expect(kafka.emit).toHaveBeenCalledTimes(2);

      const [topic, message] = kafka.emit.mock.calls[1] as [
        string,
        { key: string; value: ITransferFailedEvent },
      ];
      expect(topic).toBe(KAFKA_TOPICS.TRANSFER_FAILED);
      expect(message.value).toMatchObject({
        eventType: KAFKA_TOPICS.TRANSFER_FAILED,
        data: {
          transferId: 'tr-100',
          reference: 'TRX-100',
          failureReason: 'Insufficient funds',
        },
      });

      const failedTx = fake.insertedRows.find(
        (r) => r.type === LedgerTransactionType.TRANSFER,
      );
      expect(failedTx).toMatchObject({
        status: LedgerTransactionStatus.FAILED,
        description: 'Insufficient funds',
      });
    });

    it('completes transfer, creates entries, and emits transfer.completed when funds are sufficient', async () => {
      // 1. Fast check: not processed yet
      fake.selectResults.push([]);
      // 2. Tx balance query: 500.0000 balance
      fake.selectResults.push([{ balance: '500.0000' }]);

      await service.processTransfer(event);

      expect(fake.tx.execute).toHaveBeenCalled(); // advisory lock
      expect(kafka.emit).toHaveBeenCalledTimes(2);

      const [topic, message] = kafka.emit.mock.calls[1] as [
        string,
        { key: string; value: ITransferCompletedEvent },
      ];
      expect(topic).toBe(KAFKA_TOPICS.TRANSFER_COMPLETED);
      expect(message.value).toMatchObject({
        eventType: KAFKA_TOPICS.TRANSFER_COMPLETED,
        data: {
          transferId: 'tr-100',
          reference: 'TRX-100',
        },
      });

      const completedTx = fake.insertedRows.find(
        (r) => r.type === LedgerTransactionType.TRANSFER,
      );
      expect(completedTx).toMatchObject({
        status: LedgerTransactionStatus.COMPLETED,
      });

      // Verify double entries
      const debit = fake.insertedRows.find(
        (r) => r.direction === 'DEBIT' && r.accountId === 'acc-from',
      );
      const credit = fake.insertedRows.find(
        (r) => r.direction === 'CREDIT' && r.accountId === 'acc-to',
      );
      expect(debit).toBeDefined();
      expect(credit).toBeDefined();
    });
  });
});
