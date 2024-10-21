// DTOs for Project APIs
import { InputType, Field, ID } from '@nestjs/graphql';

@InputType()
export class UpsertProjectInput {
  @Field()
  project_name: string;

  @Field()
  path: string;

  @Field(() => ID, { nullable: true })
  project_id: string;

  @Field(() => [String], { nullable: true })
  project_packages: string[];
}
