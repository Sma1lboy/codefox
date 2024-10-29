import {
  Field,
  InputType,
  ObjectType,
  ID,
  registerEnumType,
} from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { forwardRef } from '@nestjs/common';
import { Message } from 'src/chat/message.model';
import { SystemBaseModel } from 'src/system-base-model/system-base.model';
import { User } from 'src/user/user.model';

@Entity()
@ObjectType()
export class Chat extends SystemBaseModel {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  title: string;

  @Field(() => [Message], { nullable: true })
  @OneToMany(() => Message, (message) => message.chat, { cascade: true })
  messages: Message[];

  @ManyToOne(() => User, (user) => user.chats)
  @Field(() => User)
  user: User;
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
  systemFingerprint: string | null;

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
  finishReason: string | null;
}
