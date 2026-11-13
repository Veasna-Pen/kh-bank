import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DEFAULT_KAFKA_BROKER } from '../constants/kafka.constants';

export function kafkaBrokers(config: ConfigService): string[] {
  return config
    .get<string>('KAFKA_BROKER', DEFAULT_KAFKA_BROKER)
    .split(',')
    .map((broker) => broker.trim())
    .filter(Boolean);
}

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
        brokers: kafkaBrokers(app.get(ConfigService)),
      },
      consumer: {
        groupId,
      },
    },
  });
}
