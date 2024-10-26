// DTOs for Project APIs
import { InputType, Field, ID } from '@nestjs/graphql';
import { Message } from 'src/chat/message.model';

@InputType()
export class NewChatInput {
  @Field({ nullable: true })
  title: string;
}

@InputType()
export class UpateChatTitleInput {
  @Field()
  chatId: string;

  @Field({ nullable: true })
  title: string;
}

@InputType('ChatInputType')
export class ChatInput {
  @Field()
  chatId: string;

  @Field()
  message: string;
}
