import { INestApplication } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { KAFKA_BROKER } from '../constants/kafka.constants';

/**
 * @param app The NestJS application instance
 * @param groupId The Kafka consumer group ID for this service
 */

export function connectKafkaMicroservice(
  app: INestApplication,
  groupId: string,
): void {
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: [KAFKA_BROKER],
      },
      consumer: {
        groupId,
      },
    },
  });
}
