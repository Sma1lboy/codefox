// GraphQL Resolvers for Project APIs
import {
  Args,
  Mutation,
  Query,
  Resolver,
  ResolveField,
  Parent,
  ID,
} from '@nestjs/graphql';
import { ProjectService } from './project.service';
import { Project } from './project.model';
import { FileUpload, GraphQLUpload } from 'graphql-upload-minimal';
import {
  CreateProjectInput,
  FetchPublicProjectsInputs,
  IsValidProjectInput,
} from './dto/project.input';
import { Logger, UseGuards } from '@nestjs/common';
import { ProjectGuard } from '../guard/project.guard';
import { GetUserIdFromToken } from '../decorator/get-auth-token.decorator';
import { Chat } from 'src/chat/chat.model';
import { User } from 'src/user/user.model';

@Resolver(() => Project)
export class ProjectsResolver {
  private readonly logger = new Logger('ProjectsResolver');
  constructor(private readonly projectService: ProjectService) {}

  @Query(() => [Project])
  async getUserProjects(
    @GetUserIdFromToken() userId: string,
  ): Promise<Project[]> {
    return this.projectService.getProjectsByUser(userId);
  }

  @Query(() => Project)
  @UseGuards(ProjectGuard)
  async getProject(@Args('projectId') projectId: string): Promise<Project> {
    return this.projectService.getProjectById(projectId);
  }

  @Mutation(() => Chat)
  async createProject(
    @GetUserIdFromToken() userId: string,
    @Args('createProjectInput') createProjectInput: CreateProjectInput,
  ): Promise<Chat> {
    const resChat = await this.projectService.createProject(
      createProjectInput,
      userId,
    );
    return resChat;
  }

  @Mutation(() => Boolean)
  @UseGuards(ProjectGuard)
  async deleteProject(@Args('projectId') projectId: string): Promise<boolean> {
    return this.projectService.deleteProject(projectId);
  }

  @Query(() => Boolean)
  async isValidateProject(
    @GetUserIdFromToken() userId: string,
    @Args('isValidProject') input: IsValidProjectInput,
  ): Promise<boolean> {
    return this.projectService.isValidProject(userId, input);
  }

  @ResolveField('user', () => User)
  async getUser(@Parent() project: Project): Promise<User> {
    const { user } = await this.projectService.getProjectById(project.id);
    return user;
  }

  @ResolveField('chats', () => [Chat])
  async getChats(@Parent() project: Project): Promise<Chat[]> {
    const { chats } = await this.projectService.getProjectById(project.id);
    return (await chats)?.filter((chat) => !chat.isDeleted) || [];
  }

  @Mutation(() => Project)
  async subscribeToProject(
    @GetUserIdFromToken() userId: string,
    @Args('projectId', { type: () => ID }) projectId: string,
  ): Promise<Project> {
    this.logger.log(`User ${userId} subscribing to project ${projectId}`);
    return this.projectService.subscribeToProject(userId, projectId);
  }

  @Mutation(() => Project)
  async updateProjectPhotoUrl(
    @GetUserIdFromToken() userId: string,
    @Args('projectId', { type: () => ID }) projectId: string,
    @Args('file', { type: () => GraphQLUpload }) file: FileUpload,
  ): Promise<Project> {
    this.logger.log(`User ${userId} uploading photo for project ${projectId}`);

    const { createReadStream, mimetype } = await file;
    const chunks = [];
    for await (const chunk of createReadStream()) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    return this.projectService.updateProjectPhotoUrl(
      userId,
      projectId,
      buffer,
      mimetype,
    );
  }

  @Mutation(() => Project)
  async updateProjectPublicStatus(
    @GetUserIdFromToken() userId: string,
    @Args('projectId', { type: () => ID }) projectId: string,
    @Args('isPublic') isPublic: boolean,
  ): Promise<Project> {
    this.logger.log(
      `User ${userId} updating public status for project ${projectId} to ${isPublic}`,
    );
    return this.projectService.updateProjectPublicStatus(
      userId,
      projectId,
      isPublic,
    );
  }

  @Mutation(() => Chat)
  async forkProject(
    @GetUserIdFromToken() userId: string,
    @Args('projectId', { type: () => ID }) projectId: string,
  ): Promise<Chat> {
    this.logger.log(`User ${userId} forking project ${projectId}`);
    return this.projectService.forkProject(userId, projectId);
  }

  @Query(() => [Project])
  async getSubscribedProjects(
    @GetUserIdFromToken() userId: string,
  ): Promise<Project[]> {
    this.logger.log(`Fetching subscribed projects for user ${userId}`);
    return this.projectService.getSubscribedProjects(userId);
  }

  /**
   * Fetch public projects with limittation
   * TODO(Sma1lboy): handle Rate limit later - each MAC shouldn't exceed 20 requests per minute
   * @param input the inputs
   * @returns return some projects
   */
  @Query(() => [Project])
  async fetchPublicProjects(
    @Args('input') input: FetchPublicProjectsInputs,
  ): Promise<Project[]> {
    return this.projectService.fetchPublicProjects(input);
  }
}
