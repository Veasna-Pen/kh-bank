import { Module } from '@nestjs/common';
import { CustomerDatabaseModule } from '@app/database';
import { CustomerServiceController } from './customer-service.controller';
import { CustomerServiceService } from './customer-service.service';

@Module({
  imports: [CustomerDatabaseModule],
  controllers: [CustomerServiceController],
  providers: [CustomerServiceService],
})
export class CustomerServiceModule {}
