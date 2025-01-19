import { Field, InputType } from '@nestjs/graphql';
import { IsString } from 'class-validator';

@InputType()
export class CheckTokenInput {
  @Field()
  @IsString()
  token: string;
}
