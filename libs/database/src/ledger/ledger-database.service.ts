import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PgDatabaseService } from '../pg-database.service';
import * as schema from './schema';

@Injectable()
export class LedgerDatabaseService extends PgDatabaseService<typeof schema> {
  constructor(@Optional() configService?: ConfigService) {
    super(schema, 'LEDGER_DATABASE_URL', configService);
  }
}
