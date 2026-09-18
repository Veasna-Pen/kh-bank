import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '@app/kafka';
import type { ITransferCreatedEvent } from '@app/common/interfaces/events';
import { LedgerServiceService } from './ledger-service.service';

@Controller()
export class LedgerEventsController {
  constructor(private readonly ledgerService: LedgerServiceService) {}

  @EventPattern<Record<string, ITransferCreatedEvent>>(
    KAFKA_TOPICS.TRANSFER_CREATED,
  )
  async handleTransferCreated(@Payload() event: ITransferCreatedEvent) {
    await this.ledgerService.processTransfer(event);
  }
}
