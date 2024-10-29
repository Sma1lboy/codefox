//function decorator for JWTAuth
import { applyDecorators, UseGuards } from '@nestjs/common';
import { JWTAuthGuard } from 'src/guard/jwt-auth.guard';

export function JWTAuth() {
  return applyDecorators(UseGuards(JWTAuthGuard));
}
