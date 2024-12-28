import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import 'reflect-metadata';
import { downloadAllConfig } from './downloader/universal-utils';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Credentials',
    ],
  });
  await downloadAllConfig();
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
