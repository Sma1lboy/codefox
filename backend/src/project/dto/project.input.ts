// DTOs for Project APIs
import { InputType, Field, ID } from '@nestjs/graphql';
import { ProjectPackages } from '../project-packages.model';
import { Optional } from '@nestjs/common';

/**
 * @deprecated We don't need project upsert
 */
@InputType()
export class UpsertProjectInput {
  @Field()
  projectName: string;

  path: string;

  @Field(() => ID, { nullable: true })
  projectId: string;

  @Field(() => [String], { nullable: true })
  projectPackages: string[];
}

@InputType()
export class CreateProjectInput {
  @Field(() => String, { nullable: true })
  projectName?: string;

  @Field()
  description: string;

  @Field(() => [ProjectPackage])
  packages: ProjectPackage[];

  @Field(() => String, { nullable: true })
  databaseType?: string;
}

@InputType()
export class ProjectPackage {
  @Field()
  name: string;

  @Field()
  version: string;
}

@InputType()
export class IsValidProjectInput {
  @Field(() => ID)
  projectId: string;

  @Field(() => String, { nullable: true })
  projectPath: string;
}
