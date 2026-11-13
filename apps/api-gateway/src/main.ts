import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';

import { Logger } from '@nestjs/common';
import { SERVICE_PORTS } from '@app/common';
import { AppModule } from './app.module';
import {
  createServiceProxy,
  getDownstreamServices,
} from './proxy/proxy.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.enableShutdownHooks();

  const services = getDownstreamServices();
  for (const service of services) {
    app.use(createServiceProxy(service));
  }

  const port = process.env.PORT
    ? Number(process.env.PORT)
    : SERVICE_PORTS.API_GATEWAY;
  await app.listen(port);
  Logger.log(`API Gateway is running on port ${port}`, 'Bootstrap');
}

void bootstrap();
