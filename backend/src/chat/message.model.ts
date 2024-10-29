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
import { Chat } from 'src/chat/chat.model';
import { SystemBaseModel } from 'src/system-base-model/system-base.model';

export enum MessageRole {
  User = 'User',
  Model = 'Model',
}

registerEnumType(MessageRole, {
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

  @Field(() => MessageRole)
  @Column({ type: 'text' })
  role: MessageRole;

  @Field({ nullable: true })
  @Column({ nullable: true })
  modelId?: string;

  @ManyToOne(() => Chat, (chat) => chat.messages)
  @JoinColumn({ name: 'chatId' })
  chat: Chat;
}
