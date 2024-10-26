// DTOs for Project APIs
import { InputType, Field, ID } from '@nestjs/graphql';
import { Message } from 'src/chat/chat.model';

@InputType()
export class ChatMessageInput {
  @Field({ nullable: true })
  title: string;
}
