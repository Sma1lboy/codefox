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
import DependenciesEmbeddingHandler from 'src/build-system/dependencies-context/dependencies-embedding-handler';

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
  public test = new DependenciesEmbeddingHandler();
  @Query(() => Boolean)
  async addPackage(@Args('name') name: string): Promise<boolean> {
    console.log('addPackage');
    await this.test.addPackages([{ name: 'lodash', version: '4.17.21' }]);
    console.log('addPackage done');
    return true;
  }

  @Query(() => String)
  async searchPackage(@Args('name') name: string): Promise<string> {
    const res = await this.test.searchContext('lodash');
    console.log('searchPackage', res);
    return JSON.stringify(res);
  }

  @Query(() => Boolean)
  async logout(@GetAuthToken() token: string): Promise<boolean> {
    return this.authService.logout(token);
  }

  @Query(() => User)
  async me(@GetUserIdFromToken() id: string): Promise<User> {
    return this.userService.getUser(id);
  }
}

@ObjectType()
class LoginResponse {
  @Field()
  accessToken: string;
}
