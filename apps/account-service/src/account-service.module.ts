import { Module } from '@nestjs/common';
import { AccountDatabaseModule } from '@app/database';
import { AccountServiceController } from './account-service.controller';
import { AccountServiceService } from './account-service.service';

@Module({
  imports: [AccountDatabaseModule],
  controllers: [AccountServiceController],
  providers: [AccountServiceService],
})
export class AccountServiceModule {}
