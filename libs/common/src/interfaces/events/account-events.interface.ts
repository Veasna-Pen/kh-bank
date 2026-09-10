import { AccountStatus, AccountType, Currency } from '@app/common/enums';
import { IEventEnvelope } from './event-envelope.interface';

export interface IAccountSnapshotEventData {
  accountId: string;
  customerId: string;
  userId: string;
  accountNumber: string;
  type: AccountType;
  currency: Currency;
  status: AccountStatus;
  updatedAt: string;
}

export type IAccountCreatedEvent = IEventEnvelope<IAccountSnapshotEventData>;
export type IAccountStatusUpdatedEvent =
  IEventEnvelope<IAccountSnapshotEventData>;
