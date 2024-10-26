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
import { SystemBaseModel } from 'src/system-base-model/system-base.model';

export enum Role {
  User = 'User',
  Model = 'Model',
}

registerEnumType(Role, {
  name: 'Role',
});

@Entity()
@ObjectType()
export class Message extends SystemBaseModel {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => ID)
  id: string;

  @Field()
  @Column()
  content: string;

  @Field(() => Role)
  @Column({ type: 'text' })
  role: Role;

  @Field({ nullable: true })
  @Column({ nullable: true })
  modelId?: string;
}

@Entity()
@ObjectType()
export class Chat extends SystemBaseModel {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  title: string;

  @Field(() => [Message])
  @OneToMany(() => Message, (message) => message.id)
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
