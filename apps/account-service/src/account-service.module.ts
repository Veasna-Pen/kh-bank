import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AccountDatabaseModule } from '@app/database';
import { KafkaModule } from '@app/kafka';
import { RedisModule } from '@app/redis';
import { JwtAuthModule } from '@app/auth';
import { AccountServiceController } from './account-service.controller';
import { AccountEventsController } from './account-events.controller';
import { AccountServiceService } from './account-service.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AccountDatabaseModule,
    RedisModule.register(),
    KafkaModule.register('account-service-group'),
    JwtAuthModule,
  ],
  controllers: [AccountServiceController, AccountEventsController],
  providers: [AccountServiceService],
})
export class AccountServiceModule {}
