import { ObjectType, Field, ID } from '@nestjs/graphql';
import { IsEmail } from 'class-validator';
import { Role } from 'src/auth/role/role.model';
import { SystemBaseModel } from 'src/system-base-model/system-base.model';
import { Chat } from 'src/chat/chat.model';
import { Project } from 'src/project/project.model';
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
  username: string;
  @Column()
  password: string;

  @Field()
  @Column({ unique: true })
  @IsEmail()
  email: string;

  @Field(() => [Chat])
  @OneToMany(() => Chat, (chat) => chat.user, {
    cascade: true,
    lazy: true,
    onDelete: 'CASCADE',
  })
  chats: Chat[];

  @Field(() => [Project])
  @OneToMany(() => Project, (project) => project.user, {
    cascade: true,
    lazy: true,
    onDelete: 'CASCADE',
  })
  projects: Project[];

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
