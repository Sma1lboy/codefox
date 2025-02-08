// GraphQL Resolvers for Project APIs
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ProjectService } from './project.service';
import { Project } from './project.model';
import { CreateProjectInput, IsValidProjectInput } from './dto/project.input';
import { UseGuards } from '@nestjs/common';
import { ProjectGuard } from '../guard/project.guard';
import { GetUserIdFromToken } from '../decorator/get-auth-token.decorator';
import { Chat } from 'src/chat/chat.model';

@Resolver(() => Project)
export class ProjectsResolver {
  constructor(private readonly projectsService: ProjectService) {}

  @Query(() => [Project])
  async getUserProjects(
    @GetUserIdFromToken() userId: string,
  ): Promise<Project[]> {
    return this.projectsService.getProjectsByUser(userId);
  }

  // @GetAuthToken() token: string
  @Query(() => Project)
  @UseGuards(ProjectGuard)
  async getProjectDetails(
    @Args('projectId') projectId: string,
  ): Promise<Project> {
    return this.projectsService.getProjectById(projectId);
  }

  @Mutation(() => Chat)
  async createProject(
    @GetUserIdFromToken() userId: string,
    @Args('createProjectInput') createProjectInput: CreateProjectInput,
  ): Promise<Chat> {
    const resChat = await this.projectsService.createProject(
      createProjectInput,
      userId,
    );
    return resChat;
  }

  @Mutation(() => Boolean)
  @UseGuards(ProjectGuard)
  async deleteProject(@Args('projectId') projectId: string): Promise<boolean> {
    return this.projectsService.deleteProject(projectId);
  }

  @Query(() => Boolean)
  async isValidateProject(
    @GetUserIdFromToken() userId: string,
    @Args('isValidProject') input: IsValidProjectInput,
  ): Promise<boolean> {
    return this.projectsService.isValidProject(userId, input);
  }
}
