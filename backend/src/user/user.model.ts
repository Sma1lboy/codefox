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
  UpdateDateColumn,
} from 'typeorm';

@Entity()
@ObjectType()
export class User extends SystemBaseModel {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  googleId: string;

  @Field()
  @Column()
  username: string;

  @Column({ nullable: true }) // Made nullable for OAuth users
  password: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  avatarUrl?: string;

  @Field()
  @Column({ unique: true })
  @IsEmail()
  email: string;

  @Field(() => Boolean)
  @Column({ default: false })
  isEmailConfirmed: boolean;

  @Field()
  @UpdateDateColumn({ type: 'datetime' })
  lastEmailSendTime: Date;

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

  /**
   * This field is maintained for API compatibility but is no longer actively used.
   * With the new design, a user's "subscribed projects" are just their own projects
   * that have a forkedFromId (meaning they are copies of other projects).
   *
   * Important: Subscribed projects are full copies that users can freely modify.
   * This is a key feature - allowing users to subscribe to a project and then
   * customize it to their needs while keeping a reference to the original.
   *
   * Get a user's subscribed projects by querying their projects where forkedFromId is not null.
   */
  @Field(() => [Project], {
    nullable: true,
    deprecationReason: 'Use projects with forkedFromId instead',
  })
  subscribedProjects: Project[];
}
