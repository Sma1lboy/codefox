import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('GraphQLRequest');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = GqlExecutionContext.create(context);
    const { operation, fieldName } = ctx.getInfo();
    const variables = ctx.getContext().req.body.variables;

    this.logger.log(
      `${operation.operation.toUpperCase()} \x1B[33m${fieldName}\x1B[39m${
        variables ? ` Variables: ${JSON.stringify(variables)}` : ''
      }`,
    );

    return next.handle();
  }
}
