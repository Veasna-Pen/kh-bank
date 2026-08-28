import { Module, Global } from '@nestjs/common';
import { TransferDatabaseService } from './transfer-database.service';

@Global()
@Module({
  providers: [TransferDatabaseService],
  exports: [TransferDatabaseService],
})
export class TransferDatabaseModule {}
