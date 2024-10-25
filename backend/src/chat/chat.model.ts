import { Field, InputType, ObjectType, ID } from '@nestjs/graphql';
import { SystemBaseModel } from 'src/system-base-model/system-base.model';

export enum Role {
  User = 'User',
  Model = 'Model'
}

@ObjectType()
export class Message extends SystemBaseModel {
  @Field(() => ID)
  id: string;

  @Field()
  content: string;

  @Field(() => Role)
  role: Role;

  @Field({ nullable: true })
  modelId?: string;
}

@ObjectType()
export class Chat extends SystemBaseModel {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  title: string;

  @Field(() => [Message])
  messages: Message[];
}

@ObjectType('ChatCompletionDeltaType')
class ChatCompletionDelta {
  @Field({ nullable: true })
  content?: string;
}

@ObjectType('ChatCompletionChunkType')
export class ChatCompletionChunk {
  @Field()
  id: string;

  @Field()
  object: string;

  @Field()
  created: number;

  @Field()
  model: string;

  @Field({ nullable: true })
  system_fingerprint: string | null;

  @Field(() => [ChatCompletionChoice])
  choices: ChatCompletionChoice[];
}

@ObjectType('ChatCompletionChoiceType')
class ChatCompletionChoice {
  @Field()
  index: number;

  @Field(() => ChatCompletionDelta)
  delta: ChatCompletionDelta;

  @Field({ nullable: true })
  finish_reason: string | null;
}

@InputType('ChatInputType')
export class ChatInput {
  @Field()
  message: string;
}
