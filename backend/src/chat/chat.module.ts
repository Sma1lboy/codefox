import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { HttpModule } from '@nestjs/axios';
import { ChatResolver } from './chat.resolver';
import { ChatProxyService, ChatService } from './chat.service';

@Module({
  imports: [HttpModule],
  providers: [ChatResolver, ChatProxyService, ChatService],
})
export class ChatModule {}
