// DTOs for Project APIs
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class NewChatInput {
  @Field({ nullable: true })
  title: string;
}

@InputType()
export class UpdateChatTitleInput {
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

  @Field()
  model: string;
}
