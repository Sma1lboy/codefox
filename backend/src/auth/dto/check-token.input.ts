import { Field, InputType } from '@nestjs/graphql';
import { OutputTypeFactory } from '@nestjs/graphql/dist/schema-builder/factories/output-type.factory';
import { IsString, MinLength } from 'class-validator';

@InputType()
export class CheckTokenInput {
  @Field()
  @IsString()
  token: string;
}
