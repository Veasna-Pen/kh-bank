export interface IEventEnvelope<T = unknown> {
  eventId: string;
  eventType: string;
  version: number;
  occurredAt: string;
  source: string;
  data: T;
}
