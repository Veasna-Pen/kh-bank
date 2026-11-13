import { Test, TestingModule } from '@nestjs/testing';
import { AuthDatabaseModule, AuthDatabaseService } from './auth';
import { CustomerDatabaseModule } from './customer';
import { AccountDatabaseModule } from './account';
import { TransferDatabaseModule } from './transfer';
import { LedgerDatabaseModule } from './ledger';

describe('Database Services', () => {
  let authDb: AuthDatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        AuthDatabaseModule,
        CustomerDatabaseModule,
        AccountDatabaseModule,
        TransferDatabaseModule,
        LedgerDatabaseModule,
      ],
    }).compile();

    authDb = module.get<AuthDatabaseService>(AuthDatabaseService);
  });

  it('should instantiate database services', () => {
    expect(authDb).toBeDefined();
    expect(authDb.db).toBeDefined();
    expect(authDb.schema).toBeDefined();
    expect(authDb.schema.users).toBeDefined();
  });
});
