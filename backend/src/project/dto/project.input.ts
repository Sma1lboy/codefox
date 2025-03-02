// DTOs for Project APIs
import { InputType, Field, ID } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsUUID, IsOptional } from 'class-validator';

/**
 * @deprecated We don't need project upsert
 */
@InputType()
export class UpsertProjectInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  projectName: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  path: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsString({ each: true })
  projectPackages?: string[];
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
