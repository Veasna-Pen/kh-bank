import { CustomerStatus, KycStatus } from '@app/common/enums';
import { CustomerServiceService } from './customer-service.service';

const customer = {
  id: 'customer-1',
  userId: 'user-1',
  status: CustomerStatus.ACTIVE,
  kycStatus: KycStatus.PENDING,
};

const dto = {
  addressLine: '1 Street 51',
  city: 'Phnom Penh',
  province: 'Phnom Penh',
  country: 'KH',
};

function createFakeDb(existingAddresses: unknown[]) {
  const steps: string[] = [];
  const tx = {
    select: () => ({
      from: () => ({
        where: () =>
          Object.assign(Promise.resolve(existingAddresses), {
            for: (strength: string) => {
              steps.push(`lock for ${strength}`);
              return Promise.resolve([{ id: customer.id }]);
            },
          }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => {
          steps.push('clear primary');
          return Promise.resolve();
        },
      }),
    }),
    insert: () => ({
      values: (row: Record<string, unknown>) => ({
        returning: () => {
          steps.push('insert');
          return Promise.resolve([row]);
        },
      }),
    }),
  };
  const db = {
    select: () => ({
      from: () => ({
        where: () => ({ limit: () => Promise.resolve([customer]) }),
      }),
    }),
    transaction: (work: (t: typeof tx) => Promise<unknown>) => work(tx),
  };

  return { db, steps };
}

describe('CustomerServiceService.addAddress', () => {
  const serviceWith = (db: unknown) =>
    new CustomerServiceService({ db } as never, {} as never);

  it('makes the first address primary while holding the customer lock', async () => {
    const fake = createFakeDb([]);

    const result = await serviceWith(fake.db).addAddress('user-1', dto);

    expect(result.address).toMatchObject({ isPrimary: true });
    expect(fake.steps).toEqual(['lock for update', 'insert']);
  });

  it('clears the old primary under the same lock before adding a new one', async () => {
    const fake = createFakeDb([{ id: 'address-1', isPrimary: true }]);

    const result = await serviceWith(fake.db).addAddress('user-1', {
      ...dto,
      isPrimary: true,
    });

    expect(result.address).toMatchObject({ isPrimary: true });
    expect(fake.steps).toEqual(['lock for update', 'clear primary', 'insert']);
  });
});
