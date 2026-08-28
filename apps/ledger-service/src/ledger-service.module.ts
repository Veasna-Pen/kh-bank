import { Module } from '@nestjs/common';
import { LedgerServiceController } from './ledger-service.controller';
import { LedgerServiceService } from './ledger-service.service';

@Module({
  imports: [],
  controllers: [LedgerServiceController],
  providers: [LedgerServiceService],
})
export class LedgerServiceModule {}
