import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import 'reflect-metadata';
import { downloadAll } from './downloader/universal-utils';
import * as dotenv from 'dotenv';

async function bootstrap() {
  dotenv.config(); // 加载 .env 文件中的环境变量
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
  await downloadAll();
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
