import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { ProjectModule } from './project/project.module';
import { TokenModule } from './token/token.module';
import { UserModule } from './user/user.module';
import { InitModule } from './init/init.module';
import { User } from './user/user.model';
import { AppResolver } from './app.resolver';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from 'src/interceptor/LoggingInterceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), '../frontend/src/graphql/schema.gql'),
      sortSchema: true,
      playground: true,
      subscriptions: {
        'graphql-ws': true,
        'subscriptions-transport-ws': true,
      },
      context: ({ req, res }) => ({ req, res }),
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: join(process.cwd(), 'src/database.sqlite'),
      synchronize: true,
      entities: [__dirname + '/**/*.model{.ts,.js}'],
    }),
    InitModule,
    UserModule,
    AuthModule,
    ProjectModule,
    TokenModule,
    ChatModule,
    TypeOrmModule.forFeature([User]),
  ],
  providers: [
    AppResolver,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
