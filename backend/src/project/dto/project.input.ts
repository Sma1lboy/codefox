// DTOs for Project APIs
import { InputType, Field, ID } from '@nestjs/graphql';

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
