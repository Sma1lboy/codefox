import { ObjectType, Field, ID } from '@nestjs/graphql';
import { SystemBaseModel } from 'src/system-base-model/system-base.model';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Projects } from './project.model';

@Entity()
@ObjectType()
export class ProjectPackages extends SystemBaseModel {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: string;

  @Field(() => ID)
  @Column()
  project_id: string;

  @Field()
  @Column('text')
  content: string;

  @ManyToOne(() => Projects, (project) => project.projectPackages)
  @JoinColumn({ name: 'project_id' })
  project: Projects;
}
