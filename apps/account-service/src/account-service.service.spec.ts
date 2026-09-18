import {
  AccountStatus,
  AccountType,
  Currency,
  CustomerStatus,
  KycStatus,
} from '@app/common/enums';
import { AccountServiceService } from './account-service.service';

const customer = {
  customerId: 'customer-1',
  userId: 'user-1',
  status: CustomerStatus.ACTIVE,
  kycStatus: KycStatus.VERIFIED,
};

const dto = {
  customerId: 'customer-1',
  type: AccountType.SAVINGS,
  currency: Currency.USD,
};

const duplicateKey = () =>
  Object.assign(new Error('duplicate key'), { code: '23505' });

function createFakeDb(outcomes: Array<'collide' | 'ok'>) {
  const inserted: Array<Record<string, unknown>> = [];
  const db = {
    select: () => ({
      from: () => ({
        where: () => ({ limit: () => Promise.resolve([customer]) }),
      }),
    }),
    insert: () => ({
      values: (row: Record<string, unknown>) => ({
        returning: () => {
          inserted.push(row);
          return outcomes.shift() === 'collide'
            ? Promise.reject(duplicateKey())
            : Promise.resolve([{ ...row, updatedAt: new Date() }]);
        },
      }),
    }),
  };

  return { db, inserted };
}

describe('AccountServiceService.createAccount', () => {
  let events: { publish: jest.Mock };

  beforeEach(() => {
    events = { publish: jest.fn() };
  });

  const serviceWith = (db: unknown) =>
    new AccountServiceService({ db } as never, events as never);

  it('draws a new account number when the first one is already taken', async () => {
    const fake = createFakeDb(['collide', 'ok']);

    const result = await serviceWith(fake.db).createAccount('user-1', dto);

    expect(fake.inserted).toHaveLength(2);
    expect(result.account.accountNumber).toBe(fake.inserted[1].accountNumber);
    expect(events.publish).toHaveBeenCalledTimes(1);
  });

  it('gives up after repeated collisions', async () => {
    const fake = createFakeDb(Array<'collide'>(5).fill('collide'));

    await expect(
      serviceWith(fake.db).createAccount('user-1', dto),
    ).rejects.toThrow('duplicate key');
    expect(fake.inserted).toHaveLength(5);
    expect(events.publish).not.toHaveBeenCalled();
  });
});

describe('AccountServiceService.getAccountBalance', () => {
  let events: { publish: jest.Mock };

  beforeEach(() => {
    events = { publish: jest.fn() };
  });

  it('fetches balance from ledger service for an owned account', async () => {
    const service = new AccountServiceService({} as never, events as never);
    jest.spyOn(service, 'getAccountById').mockResolvedValue({
      account: {
        id: 'acc-1',
        customerId: 'customer-1',
        accountNumber: '123456789012',
        type: AccountType.SAVINGS,
        currency: Currency.USD,
        status: AccountStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ balance: '1000.0000' }),
    });
    global.fetch = fetchMock;

    const result = await service.getAccountBalance('user-1', 'acc-1');
    expect(result).toEqual({
      accountId: 'acc-1',
      accountNumber: '123456789012',
      currency: Currency.USD,
      balance: '1000.0000',
    });
  });
});
