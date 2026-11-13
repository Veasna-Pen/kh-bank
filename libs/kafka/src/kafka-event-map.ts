import type {
  IAccountSnapshotEventData,
  ICustomerSnapshotEventData,
  ITransferCompletedEventData,
  ITransferCreatedEventData,
  ITransferFailedEventData,
  ITransferProcessingEventData,
  IUserRegisteredEventData,
} from '@app/common/interfaces/events';
import { KAFKA_TOPICS } from './constants/kafka.constants';

export interface KafkaEventMap {
  [KAFKA_TOPICS.USER_REGISTERED]: IUserRegisteredEventData;
  [KAFKA_TOPICS.CUSTOMER_CREATED]: ICustomerSnapshotEventData;
  [KAFKA_TOPICS.CUSTOMER_KYC_UPDATED]: ICustomerSnapshotEventData;
  [KAFKA_TOPICS.ACCOUNT_CREATED]: IAccountSnapshotEventData;
  [KAFKA_TOPICS.ACCOUNT_STATUS_UPDATED]: IAccountSnapshotEventData;
  [KAFKA_TOPICS.TRANSFER_CREATED]: ITransferCreatedEventData;
  [KAFKA_TOPICS.TRANSFER_PROCESSING]: ITransferProcessingEventData;
  [KAFKA_TOPICS.TRANSFER_COMPLETED]: ITransferCompletedEventData;
  [KAFKA_TOPICS.TRANSFER_FAILED]: ITransferFailedEventData;
}

export type KafkaEventTopic = keyof KafkaEventMap;
