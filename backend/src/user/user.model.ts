import { ObjectType, Field, ID } from '@nestjs/graphql';
import { IsEmail } from 'class-validator';
import { Role } from 'src/auth/role/role.model';
import { SystemBaseModel } from 'src/system-base-model/system-base.model';
import { Chat } from 'src/chat/chat.model';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';

@Entity()
@ObjectType()
export class User extends SystemBaseModel {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  username: string; // Removed unique constraint

  @Field()
  @Column({ unique: true })
  @IsEmail()
  email: string;

  @Column()
  password: string;

  @Field(() => [Chat])
  @OneToMany(() => Chat, (chat) => chat.user, {
    cascade: true, // Automatically save related chats
    lazy: true, // Load chats only when accessed
    onDelete: 'CASCADE', // Delete chats when user is deleted
  })
  chats: Chat[];

  @ManyToMany(() => Role)
  @JoinTable({
    name: 'user_roles',
    joinColumn: {
      name: 'user_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'role_id',
      referencedColumnName: 'id',
    },
  })
  roles: Role[];
}
