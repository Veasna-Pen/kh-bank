import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class RedisService {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
  ) {}

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cache.set(
      key,
      value,
      ttl !== undefined ? ttl * 1000 : undefined,
    );
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.cache.get<T>(key);

    return value ?? null;
  }

  async del(key: string): Promise<void> {
    await this.cache.del(key);
  }

  async has(key: string): Promise<boolean> {
    const value = await this.cache.get(key);

    return value !== undefined && value !== null;
  }
}
