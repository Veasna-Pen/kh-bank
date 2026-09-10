import { CustomerStatus, KycStatus } from '@app/common/enums';
import { IEventEnvelope } from './event-envelope.interface';

export interface ICustomerSnapshotEventData {
  customerId: string;
  userId: string;
  status: CustomerStatus;
  kycStatus: KycStatus;
  updatedAt: string;
}

export type ICustomerCreatedEvent = IEventEnvelope<ICustomerSnapshotEventData>;
export type ICustomerKycUpdatedEvent =
  IEventEnvelope<ICustomerSnapshotEventData>;
