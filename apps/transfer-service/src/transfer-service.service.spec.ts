import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Currency } from '@app/common/enums';
import type { ITransferCreatedEvent } from '@app/common/interfaces/events';
import { EVENT_SOURCES, EventPublisher, KAFKA_TOPICS } from '@app/kafka';
import { TransferServiceService } from './transfer-service.service';

const USER_ID = 'user-1';

const account = (overrides: Record<string, unknown> = {}) => ({
  accountId: 'account-from',
  customerId: 'customer-1',
  userId: USER_ID,
  accountNumber: '111111111111',
  currency: 'USD',
  status: 'ACTIVE',
  sourceUpdatedAt: new Date(),
  syncedAt: new Date(),
  ...overrides,
});

const recipient = (overrides: Record<string, unknown> = {}) =>
  account({ accountId: 'account-to', userId: 'user-2', ...overrides });

const dto = {
  fromAccountId: 'account-from',
  toAccountId: 'account-to',
  amount: '100.50',
  currency: Currency.USD,
};

// Each `select().from().where().limit()` resolves to the next queued result.
function createFakeDb() {
  const selectResults: unknown[][] = [];
  const query = {
    from: () => query,
    where: () => query,
    limit: () => Promise.resolve(selectResults.shift() ?? []),
  };
  const tx = {
    insert: () => ({
      values: (row: Record<string, unknown>) => ({
        returning: () => Promise.resolve([{ ...row, createdAt: new Date() }]),
      }),
    }),
  };
  const db = {
    select: () => query,
    transaction: jest.fn((fn: (t: typeof tx) => unknown) =>
      Promise.resolve(fn(tx)),
    ),
  };

  return { db, selectResults };
}

describe('TransferServiceService.createTransfer', () => {
  let fake: ReturnType<typeof createFakeDb>;
  let kafka: { emit: jest.Mock };
  let service: TransferServiceService;

  beforeEach(() => {
    fake = createFakeDb();
    kafka = { emit: jest.fn() };
    service = new TransferServiceService(
      { db: fake.db } as never,
      new EventPublisher(kafka as never, EVENT_SOURCES.TRANSFER_SERVICE),
    );
  });

  it('creates a PENDING transfer and publishes transfer.created keyed by source account', async () => {
    fake.selectResults.push([], [account()], [recipient()]);

    const result = await service.createTransfer(USER_ID, 'key-1', dto);

    expect(result.transfer).toMatchObject({
      status: 'PENDING',
      amount: '100.50',
      fromAccountId: 'account-from',
      toAccountId: 'account-to',
    });
    const [topic, message] = kafka.emit.mock.calls[0] as [
      string,
      { key: string; value: ITransferCreatedEvent },
    ];
    expect(topic).toBe(KAFKA_TOPICS.TRANSFER_CREATED);
    expect(message.key).toBe('account-from');
    expect(message.value.eventType).toBe(KAFKA_TOPICS.TRANSFER_CREATED);
    expect(message.value.data).toMatchObject({
      amount: '100.50',
      currency: Currency.USD,
    });
  });

  it('returns the original transfer when the same user repeats an Idempotency-Key', async () => {
    const original = { id: 'transfer-1', reference: 'TRX-1' };
    fake.selectResults.push(
      [{ userId: USER_ID, transferId: 'transfer-1' }],
      [original],
    );

    const result = await service.createTransfer(USER_ID, 'key-1', dto);

    expect(result.transfer).toBe(original);
    expect(fake.db.transaction).not.toHaveBeenCalled();
    expect(kafka.emit).not.toHaveBeenCalled();
  });

  it('rejects an Idempotency-Key already used by another user', async () => {
    fake.selectResults.push([{ userId: 'user-2', transferId: 'transfer-1' }]);

    await expect(service.createTransfer(USER_ID, 'key-1', dto)).rejects.toThrow(
      ConflictException,
    );
  });

  it('returns the winner when a concurrent request with the same key commits first', async () => {
    const original = { id: 'transfer-1', reference: 'TRX-1' };
    fake.db.transaction.mockRejectedValueOnce(
      Object.assign(new Error('duplicate key'), { cause: { code: '23505' } }),
    );
    fake.selectResults.push(
      [],
      [account()],
      [recipient()],
      [{ userId: USER_ID, transferId: 'transfer-1' }],
      [original],
    );

    const result = await service.createTransfer(USER_ID, 'key-1', dto);

    expect(result.transfer).toBe(original);
    expect(kafka.emit).not.toHaveBeenCalled();
  });

  it('rejects a transfer to the same account', async () => {
    fake.selectResults.push([]);

    await expect(
      service.createTransfer(USER_ID, 'key-1', {
        ...dto,
        toAccountId: 'account-from',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a source account the user does not own', async () => {
    fake.selectResults.push([], [account({ userId: 'user-2' })]);

    await expect(service.createTransfer(USER_ID, 'key-1', dto)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rejects an inactive source account', async () => {
    fake.selectResults.push([], [account({ status: 'BLOCKED' })]);

    await expect(service.createTransfer(USER_ID, 'key-1', dto)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects an unknown destination account', async () => {
    fake.selectResults.push([], [account()], []);

    await expect(service.createTransfer(USER_ID, 'key-1', dto)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rejects an inactive destination account', async () => {
    fake.selectResults.push([], [account()], [recipient({ status: 'CLOSED' })]);

    await expect(service.createTransfer(USER_ID, 'key-1', dto)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects a currency that does not match both accounts', async () => {
    fake.selectResults.push([], [account()], [recipient({ currency: 'KHR' })]);

    await expect(service.createTransfer(USER_ID, 'key-1', dto)).rejects.toThrow(
      BadRequestException,
    );
    expect(kafka.emit).not.toHaveBeenCalled();
  });
});
