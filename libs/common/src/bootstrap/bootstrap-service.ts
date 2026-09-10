import { INestApplication, Logger, Type, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

export interface ServiceBootstrapOptions {
  /** Service name, used in the startup log. */
  name: string;
  port: number;
  /** Attach microservice transports (e.g. a Kafka consumer) before listening. */
  connectMicroservices?: (app: INestApplication) => void;
}

/**
 * Creates and starts an HTTP service with the settings every service shares:
 * strict request validation, then any microservice transports, then listen.
 */
export async function bootstrapService(
  module: Type<unknown>,
  { name, port, connectMicroservices }: ServiceBootstrapOptions,
): Promise<INestApplication> {
  const app = await NestFactory.create(module);

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
