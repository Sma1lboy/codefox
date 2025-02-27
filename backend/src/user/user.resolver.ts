import {
  Args,
  Field,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { User } from './user.model';
import { UserService } from './user.service';
import { RegisterUserInput } from './dto/register-user.input';
import { LoginUserInput } from './dto/login-user.input';
import { AuthService } from 'src/auth/auth.service';
import {
  GetAuthToken,
  GetUserIdFromToken,
} from 'src/decorator/get-auth-token.decorator';
import { Logger } from '@nestjs/common';

@ObjectType()
class LoginResponse {
  @Field()
  accessToken: string;

  @Field()
  refreshToken: string;
}

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

  @Query(() => Boolean)
  async logout(@GetAuthToken() token: string): Promise<boolean> {
    return this.authService.logout(token);
  }

  @Query(() => User)
  async me(@GetUserIdFromToken() id: string): Promise<User> {
    Logger.log('me id:', id);
    return this.userService.getUser(id);
  }
}
