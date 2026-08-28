import { NestFactory } from '@nestjs/core';
import { AccountServiceModule } from './account-service.module';

async function bootstrap() {
  const app = await NestFactory.create(AccountServiceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
