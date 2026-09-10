import { Logger, OnModuleDestroy } from '@nestjs/common';
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
  private readonly logger = new Logger(this.constructor.name);

  protected constructor(
    readonly schema: TSchema,
    urlEnvKey: string,
    configService?: ConfigService,
  ) {
    const connectionString =
      configService?.get<string>(urlEnvKey) || process.env[urlEnvKey];

    this.pool = new Pool({ connectionString });
    // An idle client can fail (e.g. the database restarts). pg reports that as
    // an 'error' event, which crashes the process if nothing listens for it.
    this.pool.on('error', (error) =>
      this.logger.error(`Idle database client error: ${error.message}`),
    );
    this.db = drizzle(this.pool, { schema });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
