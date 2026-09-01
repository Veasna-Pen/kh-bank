import { Currency, LedgerTransactionStatus, LedgerTransactionType } from "@app/common/enums";
import { IEventEnvelope } from "./event-envelope.interface";


export interface ILedgerTransactionRecordedEventData {
  transactionId: string;
  reference: string;
  type: LedgerTransactionType;
  status: LedgerTransactionStatus;
  currency: Currency;
  recordedAt: string;
}

export type ILedgerTransactionRecordedEvent =
  IEventEnvelope<ILedgerTransactionRecordedEventData>;
