import { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

/**
 * Owns one pg Pool and its Drizzle client. Each database only supplies its
 * schema and the env var that holds its connection string.
 */
export abstract class PgDatabaseService<
  TSchema extends Record<string, unknown>,
> implements OnModuleDestroy {
  readonly db: NodePgDatabase<TSchema>;
  private readonly pool: Pool;

  protected constructor(
    readonly schema: TSchema,
    urlEnvKey: string,
    configService?: ConfigService,
  ) {
    const connectionString =
      configService?.get<string>(urlEnvKey) || process.env[urlEnvKey];

    this.pool = new Pool({ connectionString });
    this.db = drizzle(this.pool, { schema });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
