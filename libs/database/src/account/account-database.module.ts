import { Module, Global } from '@nestjs/common';
import { AccountDatabaseService } from './account-database.service';

@Global()
@Module({
  providers: [AccountDatabaseService],
  exports: [AccountDatabaseService],
})
export class AccountDatabaseModule {}
