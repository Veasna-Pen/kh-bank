import { NestFactory } from '@nestjs/core';
import { TransferServiceModule } from './transfer-service.module';

async function bootstrap() {
  const app = await NestFactory.create(TransferServiceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
