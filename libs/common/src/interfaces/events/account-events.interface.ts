import { AccountType, Currency } from '@app/common/enums';
import { IEventEnvelope } from './event-envelope.interface';

export interface IAccountCreatedEventData {
  accountId: string;
  customerId: string;
  accountNumber: string;
  type: AccountType;
  currency: Currency;
  createdAt: string;
}

export type IAccountCreatedEvent = IEventEnvelope<IAccountCreatedEventData>;
