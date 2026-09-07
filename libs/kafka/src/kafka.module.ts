import { DynamicModule, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import {
  KAFKA_BROKER,
  KAFKA_CLIENT_ID,
  KAFKA_CONSUMER_GROUP,
  KAFKA_SERVICE,
} from './constants/kafka.constants';

@Module({})
export class KafkaModule {
  static register(consummerGroupId?: string): DynamicModule {
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
                groupId: consummerGroupId || KAFKA_CONSUMER_GROUP,
              },
            },
          },
        ]),
      ],
      exports: [ClientsModule],
    };
  }
}
