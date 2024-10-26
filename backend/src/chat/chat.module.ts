import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { HttpModule } from '@nestjs/axios';
import { ChatResolver } from './chat.resolver';
import { ChatProxyService, ChatService } from './chat.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/user.model';
import { Chat } from './chat.model';
import { Message } from 'src/chat/message.model';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([Chat, User, Message])],
  providers: [ChatResolver, ChatProxyService, ChatService],
  exports: [ChatService],
})
export class ChatModule {}
