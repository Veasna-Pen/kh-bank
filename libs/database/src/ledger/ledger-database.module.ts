import { Module, Global } from '@nestjs/common';
import { LedgerDatabaseService } from './ledger-database.service';

@Global()
@Module({
  providers: [LedgerDatabaseService],
  exports: [LedgerDatabaseService],
})
export class LedgerDatabaseModule {}
