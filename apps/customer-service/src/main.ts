import { NestFactory } from '@nestjs/core';
import { CustomerServiceModule } from './customer-service.module';
import { SERVICE_PORTS } from '@app/common';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { KAFKA_BROKER } from '@app/kafka';

async function bootstrap() {
  const app = await NestFactory.create(CustomerServiceModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: [KAFKA_BROKER],
      },
      consumer: {
        groupId: 'customer-service-consumer',
      },
    },
  });

  await app.startAllMicroservices();
  await app.listen(SERVICE_PORTS.CUSTOMER_SERVICE);
  console.log(
    `Customer service is running on port ${SERVICE_PORTS.CUSTOMER_SERVICE}`,
  );
}
void bootstrap();
