import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CustomerDatabaseModule } from '@app/database';
import { KafkaModule } from '@app/kafka';
import { RedisModule } from '@app/redis';
import { JwtAuthModule } from '@app/auth';
import { CustomerServiceController } from './customer-service.controller';
import { CustomerServiceService } from './customer-service.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CustomerDatabaseModule,
    RedisModule.register(),
    KafkaModule.register('customer-service-group'),
    JwtAuthModule,
  ],
  controllers: [CustomerServiceController],
  providers: [CustomerServiceService],
})
export class CustomerServiceModule {}
