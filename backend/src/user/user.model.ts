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
} from 'typeorm';

@Entity()
@ObjectType()
export class User extends SystemBaseModel {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: string;

  @Field()
  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Field()
  @Column({ unique: true })
  @IsEmail()
  email: string;

  @Field(() => [Chat])
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
