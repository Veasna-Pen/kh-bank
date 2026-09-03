import { DynamicModule, Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';
import { Keyv } from 'keyv';

import {
  REDIS_HOST,
  REDIS_PORT,
  REDIS_PASSWORD,
} from './constants/redis.constants';

import { RedisService } from './redis.service';

export const REDIS_SERVICE = 'REDIS_SERVICE';

@Module({})
export class RedisModule {
  static register(): DynamicModule {
    const url = REDIS_PASSWORD
      ? `redis://:${encodeURIComponent(REDIS_PASSWORD)}@${REDIS_HOST}:${REDIS_PORT}`
      : `redis://${REDIS_HOST}:${REDIS_PORT}`;

    return {
      module: RedisModule,
      imports: [
        CacheModule.register({
          stores: [
            new Keyv({
              store: new KeyvRedis(url),
            }),
          ],
        }),
      ],

      providers: [RedisService],
      exports: [RedisService, CacheModule],
    };
  }
}
