import { Inject, Injectable } from '@nestjs/common';
import type { ClientKafka } from '@nestjs/microservices';
import { EVENT_SOURCE, KAFKA_SERVICE } from './constants/kafka.constants';
import { KafkaEventMap, KafkaEventTopic } from './kafka-event-map';
import { buildEvent } from './utils/event.utils';

/**
 * Publishes `data` wrapped in the standard event envelope, stamped with this
 * service as `source`. Pass `key` to keep one entity's events ordered within a
 * partition.
 */
@Injectable()
export class EventPublisher {
  constructor(
    @Inject(KAFKA_SERVICE) private readonly client: ClientKafka,
    @Inject(EVENT_SOURCE) private readonly source: string,
  ) {}

  publish<T extends KafkaEventTopic>(
    topic: T,
    data: KafkaEventMap[T],
    key?: string,
  ): void {
    const event = buildEvent(topic, this.source, data);

    this.client.emit(topic, key === undefined ? event : { key, value: event });
  }
}
