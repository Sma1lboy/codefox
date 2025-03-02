import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  dotenv.config();
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Credentials',
      'x-refresh-token',
    ],
  });

  console.log('process.env.PORT:', process.env.PORT);
  const server = await app.listen(process.env.PORT ?? 8080);
  logger.log(`Application is running on port ${process.env.PORT ?? 8080}`);

  // Handle shutdown signals
  const signals = ['SIGTERM', 'SIGINT'];
  for (const signal of signals) {
    process.on(signal, async () => {
      logger.log(`Received ${signal} signal. Starting graceful shutdown...`);

      try {
        await app.close();
        await server.close();
        logger.log('Server closed successfully');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    });
  }
}

bootstrap().catch((error) => {
  console.error('Fatal error during application startup:', error);
  process.exit(1);
});
