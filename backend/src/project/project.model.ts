import { ObjectType, Field, ID } from '@nestjs/graphql';
import { SystemBaseModel } from 'src/system-base-model/system-base.model';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { User } from 'src/user/user.model';
import { ProjectPackages } from './project-packages.model';
import { Chat } from 'src/chat/chat.model';

@Entity()
@ObjectType()
export class Project extends SystemBaseModel {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: string;

  @Field()
  @Column()
  projectName: string;

  @Field()
  @Column()
  projectPath: string;

  @Field(() => ID)
  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Field(() => [ProjectPackages], { nullable: true })
  @ManyToMany(
    () => ProjectPackages,
    (projectPackage) => projectPackage.projects,
  )
  @JoinTable({
    name: 'project_packages_mapping',
    joinColumn: {
      name: 'project_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'package_id',
      referencedColumnName: 'id',
    },
  })
  projectPackages: ProjectPackages[];

  @Field(() => [Chat])
  @OneToMany(() => Chat, (chat) => chat.project, {
    cascade: true, // Automatically save related chats
    lazy: true, // Load chats only when accessed
    onDelete: 'CASCADE', // Delete chats when user is deleted
  })
  chats: Chat[];
}
