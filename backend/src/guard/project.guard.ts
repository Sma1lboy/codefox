import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';

import { ProjectService } from '../project/project.service';

@Injectable()
export class ProjectGuard implements CanActivate {
  constructor(

    private readonly projectsService: ProjectService,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const gqlContext = GqlExecutionContext.create(context);
    const request = gqlContext.getContext().req;

    // Extract the authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization token is missing');
    }

    // Decode the token to get user information
    const token = authHeader.split(' ')[1];
    let user: any;
    try {
      user = this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }

    // Extract projectId from the request arguments
    const args = gqlContext.getArgs();
    const { projectId } = args;

    // Fetch the project and check if the userId matches the project's userId
    const project = await this.projectsService.getProjectById(projectId);
    if (!project) {
      throw new UnauthorizedException('Project not found');
    }

    //To do: In the feature when we need allow teams add check here

    if (project.user_id !== user.userId) {
      throw new UnauthorizedException('User is not the owner of the project');
    }

    return true;
  }
}
