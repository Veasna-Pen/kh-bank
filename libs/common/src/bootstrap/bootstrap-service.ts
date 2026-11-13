import 'reflect-metadata';
import { INestApplication, Logger, Type, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

export interface ServiceBootstrapOptions {
  name: string;
  port: number;
  connectMicroservices?: (app: INestApplication) => void;
}

export async function bootstrapService(
  module: Type<unknown>,
  { name, port, connectMicroservices }: ServiceBootstrapOptions,
): Promise<INestApplication> {
  const app = await NestFactory.create(module);

  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  if (connectMicroservices) {
    connectMicroservices(app);
    await app.startAllMicroservices();
  }

  await app.listen(port);
  Logger.log(`${name} is running on port ${port}`, 'Bootstrap');

  return app;
}
