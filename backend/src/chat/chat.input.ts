import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ChatMessageInput {
  @Field()
  role: string = '';

  @Field()
  content: string = '';
}
