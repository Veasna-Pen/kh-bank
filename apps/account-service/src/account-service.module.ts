import { Module } from '@nestjs/common';
import { AccountServiceController } from './account-service.controller';
import { AccountServiceService } from './account-service.service';

@Module({
  imports: [],
  controllers: [AccountServiceController],
  providers: [AccountServiceService],
})
export class AccountServiceModule {}
