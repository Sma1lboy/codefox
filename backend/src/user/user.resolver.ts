import { Args, Field, Mutation, ObjectType, Resolver } from '@nestjs/graphql';
import { User } from './user.model';
import { UserService } from './user.service';
import { RegisterUserInput } from './dto/register-user.input';
import { LoginUserInput } from './dto/lgoin-user.input';
import { AuthService } from 'src/auth/auth.service';

@Resolver(() => User)
export class UserResolver {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  @Mutation(() => User)
  async registerUser(
    @Args('input') registerUserInput: RegisterUserInput,
  ): Promise<User> {
    return this.authService.register(registerUserInput);
  }

  @Mutation(() => LoginResponse)
  async login(
    @Args('input') loginUserInput: LoginUserInput,
  ): Promise<LoginResponse> {
    return this.authService.login(loginUserInput);
  }
}

@ObjectType()
class LoginResponse {
  @Field()
  access_token: string;
}
