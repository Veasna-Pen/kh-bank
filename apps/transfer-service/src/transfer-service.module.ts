import { Module } from '@nestjs/common';
import { TransferDatabaseModule } from '@app/database';
import { TransferServiceController } from './transfer-service.controller';
import { TransferServiceService } from './transfer-service.service';

@Module({
  imports: [TransferDatabaseModule],
  controllers: [TransferServiceController],
  providers: [TransferServiceService],
})
export class TransferServiceModule {}
