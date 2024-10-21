import { ObjectType, Field, InputType } from '@nestjs/graphql';

@ObjectType('ChatMessageType')
export class ChatMessage {
  @Field()
  content: string;
}

@InputType('ChatInputType')
export class ChatInput {
  @Field()
  message: string;
}
