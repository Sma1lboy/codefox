import { Module } from '@nestjs/common';
import { ChatResolver } from './chat.resolver';
import { ChatProxyService, ChatService } from './chat.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/user.model';
import { Chat } from './chat.model';
import { Message } from 'src/chat/message.model';
import { ChatGuard } from '../guard/chat.guard';
import { AuthModule } from '../auth/auth.module';
import { UserService } from 'src/user/user.service';
import { PubSub } from 'graphql-subscriptions';

@Module({
  imports: [TypeOrmModule.forFeature([Chat, User, Message]), AuthModule],
  providers: [
    ChatResolver,
    ChatProxyService,
    ChatService,
    ChatGuard,
    UserService,
    {
      provide: 'PUB_SUB',
      useValue: new PubSub(),
    },
  ],
  exports: [ChatService, ChatGuard],
})
export class ChatModule {}
