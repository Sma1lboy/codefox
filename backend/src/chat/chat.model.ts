import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ChatMessage {
  @Field()
  role: string;

  @Field()
  content: string;
}
