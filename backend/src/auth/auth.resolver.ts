import { Args, Query, Resolver, Mutation, ID } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { CheckTokenInput } from './dto/check-token.input';
import { User } from '../user/user.model'; // Updated import path
import { AuthResponse } from './dto/auth-response';
import { LoginUserInput } from '../user/dto/login-user.input';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Query(() => Boolean)
  async checkToken(@Args('input') params: CheckTokenInput): Promise<boolean> {
    return this.authService.validateToken(params);
  }

  // @Mutation(() => User)
  // async assignRoles(
  //   @Args('userId', { type: () => ID }) userId: string,
  //   @Args('roleIds', { type: () => [ID] }) roleIds: string[],
  // ): Promise<User> {
  //   return this.authService.assignRoles(userId, roleIds);
  // }

  @Mutation(() => AuthResponse)
  async refreshToken(
    @Args('refreshToken') refreshToken: string
  ): Promise<AuthResponse> {
    return this.authService.refreshToken(refreshToken);
  }

  @Mutation(() => AuthResponse)
  async login(@Args('input') loginUserInput: LoginUserInput): Promise<AuthResponse> {
    return this.authService.login(loginUserInput);
  }
}
