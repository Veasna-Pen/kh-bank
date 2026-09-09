import { NestFactory } from '@nestjs/core';
import { AccountServiceModule } from './account-service.module';
import { SERVICE_PORTS } from '@app/common';
import { ValidationPipe } from '@nestjs/common';
import { connectKafkaMicroservice } from '@app/kafka';

async function bootstrap() {
  const app = await NestFactory.create(AccountServiceModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  connectKafkaMicroservice(app, 'account-service-consumer');

  await app.startAllMicroservices();
  await app.listen(SERVICE_PORTS.ACCOUNT_SERVICE);
  console.log(
    `Account service is running on port ${SERVICE_PORTS.ACCOUNT_SERVICE}`,
  );
}
void bootstrap();
