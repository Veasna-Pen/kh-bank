import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '@app/kafka';
import type { IUserRegisteredEvent } from '@app/common/interfaces/events';
import { CustomerServiceService } from './customer-service.service';

@Controller()
export class CustomerEventsController {
  constructor(
    private readonly customerServiceService: CustomerServiceService,
  ) {}

  @EventPattern<Record<string, IUserRegisteredEvent>>(
    KAFKA_TOPICS.USER_REGISTERED,
  )
  async handleUserRegistered(@Payload() event: IUserRegisteredEvent) {
    await this.customerServiceService.handleUserRegistered(event.data);
  }
}
