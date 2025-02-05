// GraphQL Resolvers for Project APIs
import {
  Args,
  Mutation,
  Query,
  Resolver,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { ProjectService } from './project.service';
import { Project } from './project.model';
import { CreateProjectInput, IsValidProjectInput } from './dto/project.input';
import { UseGuards } from '@nestjs/common';
import { ProjectGuard } from '../guard/project.guard';
import { GetUserIdFromToken } from '../decorator/get-auth-token.decorator';
import { User } from '../user/user.model';
import { Chat } from '../chat/chat.model';

@Resolver(() => Project)
export class ProjectsResolver {
  constructor(private readonly projectsService: ProjectService) {}

  @Query(() => [Project])
  async getProjects(@GetUserIdFromToken() userId: string): Promise<Project[]> {
    return this.projectsService.getProjectsByUser(userId);
  }

  @Query(() => Project)
  @UseGuards(ProjectGuard)
  async getProject(@Args('projectId') projectId: string): Promise<Project> {
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

  @ResolveField('user', () => User)
  async getUser(@Parent() project: Project): Promise<User> {
    const { user } = await this.projectsService.getProjectById(project.id);
    return user;
  }

  @ResolveField('chats', () => [Chat])
  async getChats(@Parent() project: Project): Promise<Chat[]> {
    const { chats } = await this.projectsService.getProjectById(project.id);
    return chats?.filter((chat) => !chat.isDeleted) || [];
  }
}
