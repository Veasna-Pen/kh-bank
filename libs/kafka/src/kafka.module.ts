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
