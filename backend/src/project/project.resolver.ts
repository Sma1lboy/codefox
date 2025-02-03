// GraphQL Resolvers for Project APIs
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ProjectService } from './project.service';
import { Project } from './project.model';
import { CreateProjectInput, IsValidProjectInput } from './dto/project.input';
import { UseGuards } from '@nestjs/common';
import { ProjectGuard } from '../guard/project.guard';
import { GetUserIdFromToken } from '../decorator/get-auth-token.decorator';

@Resolver(() => Project)
export class ProjectsResolver {
  constructor(private readonly projectsService: ProjectService) {}

  @Query(() => [Project])
  async getUserProjects(
    @GetUserIdFromToken() userId: number,
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

  @Mutation(() => Project)
  async createPorject(
    @GetUserIdFromToken() userId: number,
    @Args('createProjectInput') createProjectInput: CreateProjectInput,
  ): Promise<Project> {
    return this.projectsService.createProject(createProjectInput, userId);
  }

  @Mutation(() => Boolean)
  @UseGuards(ProjectGuard)
  async deleteProject(@Args('projectId') projectId: string): Promise<boolean> {
    return this.projectsService.deleteProject(projectId);
  }

  @Query(() => Boolean)
  async isValidateProject(
    @GetUserIdFromToken() userId: number,
    @Args('isValidProject') input: IsValidProjectInput,
  ): Promise<boolean> {
    return this.projectsService.isValidProject(userId, input);
  }
}
