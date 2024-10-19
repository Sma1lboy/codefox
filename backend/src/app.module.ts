import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { HttpAdapterHost } from '@nestjs/core';
import { HelloResolver } from './hello.resover';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';
import { User } from './user/user.model';
import { AuthModule } from './auth/auth.module';
import { ProjectModule } from './project/project.module';
import { TokenModule } from './token/token.module';
import { ProjectPackages } from './project/project-packages.model';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true,
      installSubscriptionHandlers: true,
      context: ({ req, res }) => ({ req, res }),
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: join(process.cwd(), 'src/database.sqlite'),
      synchronize: true,
      logging: true,
      entities: [__dirname + '/**/*.model{.ts,.js}'],
    }),
    ConfigModule.forRoot({
      envFilePath: [
        '.env.development.local',
        process.cwd() + '.env.development',
      ],
      isGlobal: true,
    }),
    JwtModule.register({
      secret: 'your-secret-key-tests',
      signOptions: { expiresIn: '1h' },
    }),
    UserModule,
    AuthModule,
    ProjectModule,
    TokenModule,
  ],
  providers: [AppService, HelloResolver],
})
export class AppModule {}
