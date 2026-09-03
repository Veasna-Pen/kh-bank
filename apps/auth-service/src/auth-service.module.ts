import { Module } from '@nestjs/common';
import { AuthDatabaseModule } from '@app/database';
import { KafkaModule } from '@app/kafka';
import { AuthServiceController } from './auth-service.controller';
import { AuthServiceService } from './auth-service.service';

import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthDatabaseModule,
    KafkaModule.register('auth-service-group'),
  ],
  controllers: [AuthServiceController],
  providers: [AuthServiceService],
})
export class AuthServiceModule {}
