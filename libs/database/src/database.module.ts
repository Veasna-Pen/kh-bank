import { Module } from '@nestjs/common';
import { AuthDatabaseModule } from './auth';
import { CustomerDatabaseModule } from './customer';
import { AccountDatabaseModule } from './account';
import { TransferDatabaseModule } from './transfer';
import { LedgerDatabaseModule } from './ledger';

@Module({
  imports: [
    AuthDatabaseModule,
    CustomerDatabaseModule,
    AccountDatabaseModule,
    TransferDatabaseModule,
    LedgerDatabaseModule,
  ],
  exports: [
    AuthDatabaseModule,
    CustomerDatabaseModule,
    AccountDatabaseModule,
    TransferDatabaseModule,
    LedgerDatabaseModule,
  ],
})
export class DatabaseModule {}
