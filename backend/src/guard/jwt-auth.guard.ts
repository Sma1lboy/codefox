import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';
import { JwtCacheService } from 'src/jwt-cache/jwt-cache.service';

@Injectable()
export class JWTAuthGuard implements CanActivate {
  private readonly logger = new Logger(JWTAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly jwtCacheService: JwtCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    this.logger.debug('Starting JWT authentication process');

    const gqlContext = GqlExecutionContext.create(context);
    const { req } = gqlContext.getContext();

    try {
      const token = this.extractTokenFromHeader(req);

      const payload = await this.verifyToken(token);

      const isTokenValid = await this.jwtCacheService.isTokenStored(token);
      if (!isTokenValid) {
        throw new UnauthorizedException('Token has been invalidated');
      }

      req.user = payload;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Authentication failed:', error);
      throw new UnauthorizedException('Invalid authentication token');
    }
  }

  private extractTokenFromHeader(req: any): string {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing');
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer') {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    if (!token) {
      throw new UnauthorizedException('Token is missing');
    }

    return token;
  }

  private async verifyToken(token: string): Promise<any> {
    try {
      return await this.jwtService.verifyAsync(token);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      }
      throw error;
    }
  }
}
