import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class LoginUserInput {
  @Field()
  email: string; // Using username for login (can be email)

  @Field()
  password: string;
}