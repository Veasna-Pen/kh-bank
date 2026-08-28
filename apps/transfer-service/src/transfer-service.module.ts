import { Module } from '@nestjs/common';
import { TransferServiceController } from './transfer-service.controller';
import { TransferServiceService } from './transfer-service.service';

@Module({
  imports: [],
  controllers: [TransferServiceController],
  providers: [TransferServiceService],
})
export class TransferServiceModule {}
