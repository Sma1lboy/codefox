import { Args, Field, Mutation, ObjectType, Resolver } from '@nestjs/graphql';
import { User } from './user.model';
import { UserService } from './user.service';
import { RegisterUserInput } from './dto/register-user.input';
import { LoginUserInput } from './dto/lgoin-user.input';

@Resolver(() => User)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Mutation(() => User)
  async registerUser(
    @Args('input') registerUserInput: RegisterUserInput,
  ): Promise<User> {
    return this.userService.registerUser(registerUserInput);
  }

  @Mutation(() => LoginResponse)
  async login(
    @Args('input') loginUserInput: LoginUserInput,
  ): Promise<LoginResponse> {
    return this.userService.login(loginUserInput);
  }
}

@ObjectType()
class LoginResponse {
  @Field()
  access_token: string;
}
