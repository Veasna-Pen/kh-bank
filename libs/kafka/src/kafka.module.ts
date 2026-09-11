import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import {
  EVENT_SOURCE,
  KAFKA_CLIENT_ID,
  KAFKA_SERVICE,
} from './constants/kafka.constants';
import { EventPublisher } from './event-publisher';
import { kafkaBrokers } from './utils/kafka.utils';

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
        ClientsModule.registerAsync([
          {
            name: KAFKA_SERVICE,
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
              transport: Transport.KAFKA,
              options: {
                client: {
                  clientId: KAFKA_CLIENT_ID,
                  brokers: kafkaBrokers(config),
                },
                // This client only emits events, so skip the reply consumer
                // (and its consumer group) Nest starts for request/response.
                producerOnlyMode: true,
              },
            }),
          },
        ]),
      ],
      providers: [{ provide: EVENT_SOURCE, useValue: source }, EventPublisher],
      exports: [EventPublisher],
    };
  }
}
