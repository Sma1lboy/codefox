import {
  Args,
  Query,
  Resolver,
  Mutation,
  Field,
  ObjectType,
} from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { CheckTokenInput } from './dto/check-token.input';

@ObjectType()
export class RefreshTokenResponse {
  @Field()
  accessToken: string;

  @Field()
  refreshToken: string;
}

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Query(() => Boolean)
  async checkToken(@Args('input') params: CheckTokenInput): Promise<boolean> {
    return this.authService.validateToken(params);
  }

  @Mutation(() => RefreshTokenResponse)
  async refreshToken(
    @Args('refreshToken') refreshToken: string,
  ): Promise<RefreshTokenResponse> {
    return this.authService.refreshToken(refreshToken);
  }
}
