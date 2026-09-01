import { IEventEnvelope } from "./event-envelope.interface";

export interface IUserRegisteredEventData {
  userId: string;
  phone: string;
  registeredAt: string;
}

export type IUserRegisteredEvent = IEventEnvelope<IUserRegisteredEventData>;
