import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    let requestInfo: string;

    // Check if we can create a GraphQL context from this request
    try {
      // Attempt to create a GraphQL context
      const gqlContext = GqlExecutionContext.create(context);
      const info = gqlContext.getInfo();
      
      if (info && info.operation) {
        // This is a GraphQL request
        const operation = info.operation.operation;
        const fieldName = info.fieldName;
        requestInfo = `GraphQL: ${operation} ${fieldName}`;
      } else {
        // If we got here but can't get operation info, fall back to HTTP request info
        const httpContext = context.switchToHttp();
        const request = httpContext.getRequest();
        
        if (request) {
          const method = request.method;
          const url = request.url;
          requestInfo = `REST: ${method} ${url}`;
        } else {
          // Default if neither context is fully available
          requestInfo = 'Unknown request type';
        }
      }
    } catch (error) {
      // If creating a GraphQL context fails, it's probably a REST request
      try {
        const httpContext = context.switchToHttp();
        const request = httpContext.getRequest();
        
        if (request) {
          const method = request.method;
          const url = request.url;
          requestInfo = `REST: ${method} ${url}`;
        } else {
          requestInfo = 'Unknown request type';
        }
      } catch (httpError) {
        requestInfo = 'Failed to determine request type';
        this.logger.error('Error determining request type', httpError.stack);
      }
    }

    this.logger.log(`Request started: ${requestInfo}`);

    return next.handle().pipe(
      tap({
        next: () => {
          const timeSpent = Date.now() - now;
          this.logger.log(`Request completed: ${requestInfo} (${timeSpent}ms)`);
        },
        error: (error) => {
          const timeSpent = Date.now() - now;
          this.logger.error(`Request failed: ${requestInfo} (${timeSpent}ms)`, error.stack);
        }
      }),
    );
  }
}