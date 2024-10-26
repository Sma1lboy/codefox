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

  @ManyToOne(() => Chat, (chat) => chat.messages)
  @JoinColumn({ name: 'chatId' })
  chat: Chat;
}
