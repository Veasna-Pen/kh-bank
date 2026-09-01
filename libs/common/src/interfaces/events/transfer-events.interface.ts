import { Currency } from "@app/common/enums";
import { IEventEnvelope } from "./event-envelope.interface";


export interface ITransferCreatedEventData {
  transferId: string;
  reference: string;
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  currency: Currency;
  description?: string;
  createdAt: string;
}

export interface ITransferProcessingEventData {
  transferId: string;
  reference: string;
  processingAt: string;
}

export interface ITransferCompletedEventData {
  transferId: string;
  reference: string;
  completedAt: string;
}

export interface ITransferFailedEventData {
  transferId: string;
  reference: string;
  failureReason: string;
  failedAt: string;
}

export type ITransferCreatedEvent = IEventEnvelope<ITransferCreatedEventData>;
export type ITransferProcessingEvent = IEventEnvelope<ITransferProcessingEventData>;
export type ITransferCompletedEvent = IEventEnvelope<ITransferCompletedEventData>;
export type ITransferFailedEvent = IEventEnvelope<ITransferFailedEventData>;
