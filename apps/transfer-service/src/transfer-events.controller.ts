import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '@app/kafka';
import type {
  IAccountCreatedEvent,
  IAccountStatusUpdatedEvent,
  ITransferCompletedEvent,
  ITransferFailedEvent,
  ITransferProcessingEvent,
} from '@app/common/interfaces/events';
import { TransferServiceService } from './transfer-service.service';

@Controller()
export class TransferEventsController {
  constructor(
    private readonly transferServiceService: TransferServiceService,
  ) {}

  @EventPattern<Record<string, IAccountCreatedEvent>>(
    KAFKA_TOPICS.ACCOUNT_CREATED,
  )
  async handleAccountCreated(@Payload() event: IAccountCreatedEvent) {
    await this.transferServiceService.upsertAccountSnapshot(event.data);
  }

  @EventPattern<Record<string, IAccountStatusUpdatedEvent>>(
    KAFKA_TOPICS.ACCOUNT_STATUS_UPDATED,
  )
  async handleAccountStatusUpdated(
    @Payload() event: IAccountStatusUpdatedEvent,
  ) {
    await this.transferServiceService.upsertAccountSnapshot(event.data);
  }

  @EventPattern<Record<string, ITransferProcessingEvent>>(
    KAFKA_TOPICS.TRANSFER_PROCESSING,
  )
  async handleTransferProcessing(@Payload() event: ITransferProcessingEvent) {
    await this.transferServiceService.markProcessing(event.data.transferId);
  }

  @EventPattern<Record<string, ITransferCompletedEvent>>(
    KAFKA_TOPICS.TRANSFER_COMPLETED,
  )
  async handleTransferCompleted(@Payload() event: ITransferCompletedEvent) {
    await this.transferServiceService.markCompleted(
      event.data.transferId,
      new Date(event.data.completedAt),
    );
  }

  @EventPattern<Record<string, ITransferFailedEvent>>(
    KAFKA_TOPICS.TRANSFER_FAILED,
  )
  async handleTransferFailed(@Payload() event: ITransferFailedEvent) {
    await this.transferServiceService.markFailed(
      event.data.transferId,
      event.data.failureReason,
    );
  }
}
