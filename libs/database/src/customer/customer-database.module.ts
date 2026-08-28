import { Module, Global } from '@nestjs/common';
import { CustomerDatabaseService } from './customer-database.service';

@Global()
@Module({
  providers: [CustomerDatabaseService],
  exports: [CustomerDatabaseService],
})
export class CustomerDatabaseModule {}
