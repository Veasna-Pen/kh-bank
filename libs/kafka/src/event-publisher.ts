import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ClientKafka } from '@nestjs/microservices';
import { EVENT_SOURCE, KAFKA_SERVICE } from './constants/kafka.constants';
import { KafkaEventMap, KafkaEventTopic } from './kafka-event-map';
import { buildEvent } from './utils/event.utils';

/**
 * Publishes `data` wrapped in the standard event envelope, stamped with this
 * service as `source`. Pass `key` to keep one entity's events ordered within a
 * partition.
 *
 * Fire-and-forget: the caller doesn't wait for the broker, but a failed send is
 * logged with its event id instead of being dropped.
 */
@Injectable()
export class EventPublisher {
  private readonly logger = new Logger(EventPublisher.name);

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

    // emit() sends right away, but only reports a failure to subscribers.
    this.client
      .emit(topic, key === undefined ? event : { key, value: event })
      .subscribe({
        error: (error: unknown) =>
          this.logger.error(
            `Failed to publish ${topic} event ${event.eventId}`,
            error instanceof Error ? error.stack : String(error),
          ),
      });
  }
}
