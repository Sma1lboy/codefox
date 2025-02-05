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
} from 'typeorm';
import { User } from 'src/user/user.model';
import { ProjectPackages } from './project-packages.model';
import { Chat } from 'src/chat/chat.model';

@Entity()
@ObjectType()
export class Project extends SystemBaseModel {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
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

  @ManyToOne(() => User, (user) => user.projects, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'user_id' })
  @Field(() => User)
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

  @Field(() => [Chat], { nullable: true })
  @OneToMany(() => Chat, (chat) => chat.project, {
    cascade: true,
    eager: false,
  })
  chats: Chat[];
}
