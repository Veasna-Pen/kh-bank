import * as crypto from 'crypto';
import type { IEventEnvelope } from '@app/common/interfaces/events';

export function buildEvent<T>(
  eventType: string,
  source: string,
  data: T,
): IEventEnvelope<T> {
  return {
    eventId: crypto.randomUUID(),
    eventType,
    version: 1,
    occurredAt: new Date().toISOString(),
    source,
    data,
  };
}
