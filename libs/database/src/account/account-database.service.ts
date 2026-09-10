import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PgDatabaseService } from '../pg-database.service';
import * as schema from './schema';

@Injectable()
export class AccountDatabaseService extends PgDatabaseService<typeof schema> {
  constructor(@Optional() configService?: ConfigService) {
    super(schema, 'ACCOUNT_DATABASE_URL', configService);
  }
}
