import { Module } from '@nestjs/common';
import { ChatService } from './chat.service.ts';
import { ChatResolver } from './chat.resolver.ts';

@Module({
  providers: [ChatResolver, ChatService],
})
export class ChatModule {}
