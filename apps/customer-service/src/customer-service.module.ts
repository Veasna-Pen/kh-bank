import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CustomerDatabaseModule } from '@app/database';
import { EVENT_SOURCES, KafkaModule } from '@app/kafka';
import { RedisModule } from '@app/redis';
import { JwtAuthModule } from '@app/auth';
import { CustomerServiceController } from './customer-service.controller';
import { CustomerEventsController } from './customer-events.controller';
import { CustomerServiceService } from './customer-service.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CustomerDatabaseModule,
    RedisModule.register(),
    KafkaModule.register(EVENT_SOURCES.CUSTOMER_SERVICE),
    JwtAuthModule,
  ],
  controllers: [CustomerServiceController, CustomerEventsController],
  providers: [CustomerServiceService],
})
export class CustomerServiceModule {}
