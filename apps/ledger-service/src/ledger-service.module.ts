import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LedgerDatabaseModule } from '@app/database';
import { EVENT_SOURCES, KafkaModule } from '@app/kafka';
import { JwtAuthModule } from '@app/auth';
import { requireEnv } from '@app/common/config';
import { LedgerServiceController } from './ledger-service.controller';
import { LedgerEventsController } from './ledger-events.controller';
import { LedgerServiceService } from './ledger-service.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: requireEnv('LEDGER_DATABASE_URL', 'JWT_ACCESS_SECRET'),
    }),
    LedgerDatabaseModule,
    KafkaModule.register(EVENT_SOURCES.LEDGER_SERVICE),
    JwtAuthModule,
  ],
  controllers: [LedgerServiceController, LedgerEventsController],
  providers: [LedgerServiceService],
})
export class LedgerServiceModule {}
