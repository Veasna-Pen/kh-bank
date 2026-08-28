import { NestFactory } from '@nestjs/core';
import { LedgerServiceModule } from './ledger-service.module';

async function bootstrap() {
  const app = await NestFactory.create(LedgerServiceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
