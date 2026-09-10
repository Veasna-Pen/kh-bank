import { DynamicModule, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import {
  EVENT_SOURCE,
  KAFKA_BROKER,
  KAFKA_CLIENT_ID,
  KAFKA_SERVICE,
} from './constants/kafka.constants';
import { EventPublisher } from './event-publisher';

@Module({})
export class KafkaModule {
  /**
   * @param source this service's name, stamped as `source` on every event it
   * publishes through EventPublisher
   */
  static register(source: string): DynamicModule {
    return {
      module: KafkaModule,
      imports: [
        ClientsModule.register([
          {
            name: KAFKA_SERVICE,
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: KAFKA_CLIENT_ID,
                brokers: [KAFKA_BROKER],
              },
              consumer: {
                groupId: `${source}-group`,
              },
            },
          },
        ]),
      ],
      providers: [{ provide: EVENT_SOURCE, useValue: source }, EventPublisher],
      exports: [EventPublisher],
    };
  }
}
