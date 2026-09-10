import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '@app/kafka';
import type {
  ICustomerCreatedEvent,
  ICustomerKycUpdatedEvent,
} from '@app/common/interfaces/events';
import { AccountServiceService } from './account-service.service';

@Controller()
export class AccountEventsController {
  constructor(private readonly accountServiceService: AccountServiceService) {}

  @EventPattern<Record<string, ICustomerCreatedEvent>>(
    KAFKA_TOPICS.CUSTOMER_CREATED,
  )
  async handleCustomerCreated(@Payload() event: ICustomerCreatedEvent) {
    await this.accountServiceService.upsertCustomerSnapshot(event.data);
  }

  @EventPattern<Record<string, ICustomerKycUpdatedEvent>>(
    KAFKA_TOPICS.CUSTOMER_KYC_UPDATED,
  )
  async handleCustomerKycUpdated(@Payload() event: ICustomerKycUpdatedEvent) {
    await this.accountServiceService.upsertCustomerSnapshot(event.data);
  }
}
