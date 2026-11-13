import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AccountDatabaseModule } from '@app/database';
import { EVENT_SOURCES, KafkaModule } from '@app/kafka';
import { JwtAuthModule } from '@app/auth';
import { requireEnv } from '@app/common/config';
import { AccountServiceController } from './account-service.controller';
import { AccountEventsController } from './account-events.controller';
import { AccountServiceService } from './account-service.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: requireEnv('ACCOUNT_DATABASE_URL', 'JWT_ACCESS_SECRET'),
    }),
    AccountDatabaseModule,
    KafkaModule.register(EVENT_SOURCES.ACCOUNT_SERVICE),
    JwtAuthModule,
  ],
  controllers: [AccountServiceController, AccountEventsController],
  providers: [AccountServiceService],
})
export class AccountServiceModule {}
