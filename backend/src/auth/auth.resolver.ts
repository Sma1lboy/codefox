import { Args, Query, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { CheckTokenInput } from './dto/check-token.input';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Query(() => Boolean)
  async checkToken(@Args('input') params: CheckTokenInput): Promise<boolean> {
    return this.authService.validateToken(params);
  }
}
