import { DynamicModule, Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import KeyvRedis from '@keyv/redis';
import { Keyv } from 'keyv';

import { RedisService } from './redis.service';

function redisUrl(config: ConfigService): string {
  const host = config.get<string>('REDIS_HOST', 'localhost');
  const port = config.get<string>('REDIS_PORT', '6379');
  const password = config.get<string>('REDIS_PASSWORD');

  return password
    ? `redis://:${encodeURIComponent(password)}@${host}:${port}`
    : `redis://${host}:${port}`;
}

@Module({})
export class RedisModule {
  static register(): DynamicModule {
    return {
      module: RedisModule,
      imports: [
        CacheModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            stores: [new Keyv({ store: new KeyvRedis(redisUrl(config)) })],
          }),
        }),
      ],

      providers: [RedisService],
      exports: [RedisService, CacheModule],
    };
  }
}
