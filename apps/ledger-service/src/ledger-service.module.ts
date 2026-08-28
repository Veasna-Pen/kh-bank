import { Module } from '@nestjs/common';
import { LedgerDatabaseModule } from '@app/database';
import { LedgerServiceController } from './ledger-service.controller';
import { LedgerServiceService } from './ledger-service.service';

@Module({
  imports: [LedgerDatabaseModule],
  controllers: [LedgerServiceController],
  providers: [LedgerServiceService],
})
export class LedgerServiceModule {}
