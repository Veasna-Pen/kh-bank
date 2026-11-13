import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PgDatabaseService } from '../pg-database.service';
import * as schema from './schema';

@Injectable()
export class TransferDatabaseService extends PgDatabaseService<typeof schema> {
  constructor(@Optional() configService?: ConfigService) {
    super(schema, 'TRANSFER_DATABASE_URL', configService);
  }
}
