// GraphQL Resolvers for Project APIs
import {
  Args,
  Field,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { ProjectService } from './project.service';
import { Project } from './project.model';
import { UpsertProjectInput } from './dto/project.input';
import { UseGuards } from '@nestjs/common';
import { ProjectGuard } from '../guard/project.guard';
import { GetUserIdFromToken } from '../decorator/get-auth-token';

@Resolver(() => Project)
export class ProjectsResolver {
  constructor(private readonly projectsService: ProjectsService) {}

  @Query(() => [Projects])
  async getUserProjects(
    @GetUserIdFromToken() userId: string,
  ): Promise<Projects[]> {
    return this.projectsService.getProjectsByUser(userId);
  }

  // @GetAuthToken() token: string
  @Query(() => Project)
  @UseGuards(ProjectGuard)
  async getProjectDetails(
    @Args('projectId') projectId: string,
  ): Promise<Projects> {
    return this.projectsService.getProjectById(projectId);
  }

  @Mutation(() => Projects)
  async upsertProject(
    @GetUserIdFromToken() userId: string,
    @Args('upsertProjectInput') upsertProjectInput: UpsertProjectInput,
  ): Promise<Projects> {
    return this.projectsService.upsertProject(upsertProjectInput, userId);
  }

  @Mutation(() => Boolean)
  @UseGuards(ProjectGuard)
  async deleteProject(@Args('projectId') projectId: string): Promise<boolean> {
    return this.projectsService.deleteProject(projectId);
  }

  @Mutation(() => Boolean)
  @UseGuards(ProjectGuard)
  async updateProjectPath(
    @Args('projectId') projectId: string,
    @Args('newPath') newPath: string,
  ): Promise<boolean> {
    return this.projectsService.updateProjectPath(projectId, newPath);
  }

  @Mutation(() => Boolean)
  @UseGuards(ProjectGuard)
  async removePackageFromProject(
    @Args('projectId') projectId: string,
    @Args('packageId') packageId: string,
  ): Promise<boolean> {
    return this.projectsService.removePackageFromProject(projectId, packageId);
  }
}
