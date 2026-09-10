import { NestFactory } from '@nestjs/core';
import { TransferServiceModule } from './transfer-service.module';
import { SERVICE_PORTS } from '@app/common';
import { ValidationPipe } from '@nestjs/common';
import { connectKafkaMicroservice } from '@app/kafka';

async function bootstrap() {
  const app = await NestFactory.create(TransferServiceModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  connectKafkaMicroservice(app, 'transfer-service-consumer');

  await app.startAllMicroservices();
  await app.listen(SERVICE_PORTS.TRANSFER_SERVICE);
  console.log(
    `Transfer service is running on port ${SERVICE_PORTS.TRANSFER_SERVICE}`,
  );
}
void bootstrap();
