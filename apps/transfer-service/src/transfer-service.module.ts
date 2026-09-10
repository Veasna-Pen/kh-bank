import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TransferDatabaseModule } from '@app/database';
import { EVENT_SOURCES, KafkaModule } from '@app/kafka';
import { JwtAuthModule } from '@app/auth';
import { TransferServiceController } from './transfer-service.controller';
import { TransferEventsController } from './transfer-events.controller';
import { TransferServiceService } from './transfer-service.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TransferDatabaseModule,
    KafkaModule.register(EVENT_SOURCES.TRANSFER_SERVICE),
    JwtAuthModule,
  ],
  controllers: [TransferServiceController, TransferEventsController],
  providers: [TransferServiceService],
})
export class TransferServiceModule {}
