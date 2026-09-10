import { Module } from '@nestjs/common';
import { AuthDatabaseModule } from '@app/database';
import { EVENT_SOURCES, KafkaModule } from '@app/kafka';
import { RedisModule } from '@app/redis';
import { JwtAuthModule } from '@app/auth';
import { AuthServiceController } from './auth-service.controller';
import { AuthServiceService } from './auth-service.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthDatabaseModule,
    RedisModule.register(),
    KafkaModule.register(EVENT_SOURCES.AUTH_SERVICE),
    JwtAuthModule,
  ],
  controllers: [AuthServiceController],
  providers: [AuthServiceService],
})
export class AuthServiceModule {}
