// DTOs for Project APIs
import { InputType, Field, ID } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsUUID, IsOptional } from 'class-validator';

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
