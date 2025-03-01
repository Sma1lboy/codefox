// Project Service for managing Projects
import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { Project } from './project.model';
import { ProjectPackages } from './project-packages.model';
import {
  CreateProjectInput,
  IsValidProjectInput,
  ProjectPackage,
} from './dto/project.input';
import {
  buildProjectSequenceByProject,
  generateProjectNamePrompt,
} from './build-system-utils';
import { OpenAIModelProvider } from 'src/common/model-provider/openai-model-provider';
import { MessageRole } from 'src/chat/message.model';
import { BuilderContext } from 'src/build-system/context';
import { ChatService } from 'src/chat/chat.service';
import { Chat } from 'src/chat/chat.model';
import { v4 as uuidv4 } from 'uuid';
@Injectable()
export class ProjectService {
  private readonly model: OpenAIModelProvider =
    OpenAIModelProvider.getInstance();
  private readonly logger = new Logger('ProjectService');
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(ProjectPackages)
    private projectPackagesRepository: Repository<ProjectPackages>,
    private chatService: ChatService,
  ) {}

  async getProjectsByUser(userId: string): Promise<Project[]> {
    const projects = await this.projectsRepository.find({
      where: { userId, isDeleted: false },
      relations: ['projectPackages', 'chats'],
    });

    if (projects && projects.length > 0) {
      await Promise.all(
        projects.map(async (project) => {
          // Filter deleted packages
          project.projectPackages = project.projectPackages.filter(
            (pkg) => !pkg.isDeleted,
          );
          // Filter deleted chats
          if (project.chats) {
            const chats = await project.chats;
            this.logger.log('Project chats:', chats);
            // Create a new Promise that resolves to filtered chats
            project.chats = Promise.resolve(
              chats.filter((chat) => !chat.isDeleted),
            );
          }
        }),
      );
    }

    return projects.length > 0 ? projects : [];
  }

  async getProjectById(projectId: string): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId, isDeleted: false },
      relations: ['projectPackages', 'chats', 'user'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found.`);
    }

    project.projectPackages = project.projectPackages.filter(
      (pkg) => !pkg.isDeleted,
    );

    if (project.chats) {
      const chats = await project.chats;
      this.logger.log('Project chats:', chats);
      project.chats = Promise.resolve(chats.filter((chat) => !chat.isDeleted));
    }

    return project;
  }

  // binding project and chats
  async bindProjectAndChat(project: Project, chat: Chat): Promise<boolean> {
    await this.projectsRepository.manager.connection.synchronize();
    await this.chatRepository.manager.connection.synchronize();
    if (!chat) {
      this.logger.error('chat is undefined');
      return false;
    }
    try {
      chat.project = project;

      // Get current chats and add new chat
      const currentChats = await project.chats;
      project.chats = Promise.resolve([...currentChats, chat]);

      // Save both entities
      await this.projectsRepository.save(project);
      await this.chatRepository.save(chat);

      return true;
    } catch (error) {
      this.logger.error('Error binding project and chat:', error);
      return false;
    }
  }

  async createProject(
    input: CreateProjectInput,
    userId: string,
  ): Promise<Chat> {
    const defaultChatPromise = await this.chatService.createChat(userId, {
      title: input.projectName || 'Default Project Chat',
    });

    const projectPromise = (async () => {
      try {
        const nameGenerationPrompt = await generateProjectNamePrompt(
          input.description,
        );
        const response = await this.model.chatSync({
          model: input.model || OpenAIModelProvider.getInstance().baseModel,
          messages: [
            {
              role: MessageRole.System,
              content:
                'You are a specialized project name generator. Respond only with the generated name.',
            },
            {
              role: MessageRole.User,
              content: nameGenerationPrompt,
            },
          ],
        });

        if (input.projectName === '') {
          this.logger.debug(
            'Project name not exist in input, generating project name',
          );
          input.projectName = response;
          this.logger.debug(`Generated project name: ${input.projectName}`);
        }

        const sequence = buildProjectSequenceByProject(input);
        const context = new BuilderContext(sequence, sequence.id);
        const projectPath = await context.execute();

        const project = new Project();
        project.projectName = input.projectName;
        project.projectPath = projectPath;
        project.userId = userId;

        project.projectPackages = await this.transformInputToProjectPackages(
          input.packages,
        );

        const savedProject = await this.projectsRepository.save(project);

        const defaultChat = await defaultChatPromise;
        await this.bindProjectAndChat(savedProject, defaultChat);

        console.log('Binded project and chats');
        return savedProject;
      } catch (error) {
        this.logger.error('Error creating project:', error);
        throw new InternalServerErrorException('Error creating the project.');
      }
    })();

    return defaultChatPromise;
  }
  private async transformInputToProjectPackages(
    inputPackages: ProjectPackage[],
  ): Promise<ProjectPackages[]> {
    try {
      // Find existing packages in database
      const packageNames = inputPackages.map((pkg) => pkg.name);
      const existingPackages = await this.projectPackagesRepository.find({
        where: {
          content: In(packageNames),
        },
      });

      // Create map of existing packages for quick lookup
      const existingPackagesMap = new Map(
        existingPackages.map((pkg) => [pkg.content, pkg]),
      );

      // Transform each input package
      const transformedPackages = await Promise.all(
        inputPackages.map(async (inputPkg) => {
          // Check if package already exists
          const existingPackage = existingPackagesMap.get(inputPkg.name);
          if (existingPackage) {
            // Update version if needed
            if (existingPackage.version !== inputPkg.version) {
              existingPackage.version = inputPkg.version;
              return await this.projectPackagesRepository.save(existingPackage);
            }
            return existingPackage;
          }

          // Create new package if it doesn't exist
          const newPackage = new ProjectPackages();
          newPackage.content = inputPkg.name;
          newPackage.version = inputPkg.version;
          return await this.projectPackagesRepository.save(newPackage);
        }),
      );

      return transformedPackages;
    } catch (error) {
      this.logger.error('Error transforming packages:', error);
      return Promise.resolve([]);
    }
  }

  async deleteProject(projectId: string): Promise<boolean> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
      relations: ['projectPackages', 'chats'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found.`);
    }

    try {
      // Soft delete the project
      project.isActive = false;
      project.isDeleted = true;
      await this.projectsRepository.save(project);

      // Soft delete related project packages
      if (project.projectPackages?.length > 0) {
        for (const pkg of project.projectPackages) {
          pkg.isActive = false;
          pkg.isDeleted = true;
          await this.projectPackagesRepository.save(pkg);
        }
      }

      // Note: Related chats will be automatically handled by the CASCADE setting

      return true;
    } catch (error) {
      throw new InternalServerErrorException('Error deleting the project.');
    }
  }

  async isValidProject(
    userId: string,
    input: IsValidProjectInput,
  ): Promise<boolean> {
    try {
      const project = await this.projectsRepository.findOne({
        where: {
          id: input.projectId,
          projectPath: input.projectPath,
          isDeleted: false,
        },
      });

      if (!project) {
        this.logger.debug(
          `Project not found with id: ${input.projectId}, path: ${input.projectPath}`,
        );
        return false;
      }

      if (project.userId !== userId) {
        this.logger.debug(
          `User ${userId} is not owner of project ${input.projectId}`,
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Error validating project: ${error.message}`);
      return false;
    }
  }

  /**
   * Subscribe to another user's project by creating a copy for the subscriber.
   * The copy becomes fully owned by the subscriber and can be freely modified.
   * This is a key feature - allowing users to start with someone else's project
   * and customize it to their needs.
   *
   * @param userId The user ID of the subscriber
   * @param projectId The project ID to subscribe to
   * @returns The newly created project copy that the user can modify
   */
  async subscribeToProject(
    userId: string,
    projectId: string,
  ): Promise<Project> {
    const sourceProject = await this.getProjectById(projectId);

    // Check if the project is public
    if (!sourceProject.isPublic) {
      throw new ForbiddenException('Cannot subscribe to a private project');
    }

    // Prevent users from subscribing to their own projects
    if (sourceProject.userId === userId) {
      throw new ForbiddenException('Cannot subscribe to your own project');
    }

    // Create a new project copy for the subscriber
    const copiedProject = new Project();
    copiedProject.projectName = sourceProject.projectName;
    copiedProject.projectPath = sourceProject.projectPath; // You may want to create a new path
    copiedProject.userId = userId;
    copiedProject.isPublic = false; // Default to private for the copy
    copiedProject.uniqueProjectId = uuidv4(); // Generate a new unique ID
    copiedProject.forkedFromId = sourceProject.uniqueProjectId; // Track original project
    copiedProject.photoUrl = sourceProject.photoUrl; // Copy the screenshot

    // Copy packages if needed
    if (sourceProject.projectPackages?.length > 0) {
      copiedProject.projectPackages = [...sourceProject.projectPackages];
    }

    // Save the new project
    const savedProject = await this.projectsRepository.save(copiedProject);

    // Increment the original project's subscription count
    sourceProject.subNumber += 1;
    await this.projectsRepository.save(sourceProject);

    return savedProject;
  }

  /**
   * Update a project's photo URL
   * @param userId The user ID making the request
   * @param projectId The project ID to update
   * @param photoUrl The new photo URL
   * @returns The updated project
   */
  async updateProjectPhotoUrl(
    userId: string,
    projectId: string,
    photoUrl: string,
  ): Promise<Project> {
    const project = await this.getProjectById(projectId);

    // Check ownership permission
    this.checkProjectOwnership(project, userId);

    // Update photo URL
    project.photoUrl = photoUrl;

    return this.projectsRepository.save(project);
  }

  /**
   * Update a project's public status
   * @param userId The user ID making the request
   * @param projectId The project ID to update
   * @param isPublic The new public status
   * @returns The updated project
   */
  async updateProjectPublicStatus(
    userId: string,
    projectId: string,
    isPublic: boolean,
  ): Promise<Project> {
    const project = await this.getProjectById(projectId);

    // Check ownership permission
    this.checkProjectOwnership(project, userId);

    // Update public status
    project.isPublic = isPublic;

    return this.projectsRepository.save(project);
  }

  // forkProject is now essentially the same as subscribeToProject
  // We'll keep this method as an alias for API consistency
  /**
   * Fork an existing project (alias for subscribeToProject)
   * @param userId The user ID forking the project
   * @param projectId The project ID to fork
   * @returns The newly created forked project
   */
  async forkProject(userId: string, projectId: string): Promise<Project> {
    return this.subscribeToProject(userId, projectId);
  }

  /**
   * Get all projects subscribed/forked by a user
   * @param userId The user ID
   * @returns Array of projects that are forks of other projects
   */
  async getSubscribedProjects(userId: string): Promise<Project[]> {
    // With the new approach, subscribed projects are just the user's own projects
    // that have a forkedFromId (meaning they were copied from another project)
    const subscribedProjects = await this.projectsRepository.find({
      where: {
        userId: userId,
        isDeleted: false,
        forkedFromId: Not(null), // Only get projects that are forks
      },
      relations: ['projectPackages', 'user'],
    });

    return subscribedProjects;
  }

  /**
   * Get all public projects for discovery
   * @returns Array of public projects
   */
  async getPublicProjects(): Promise<Project[]> {
    return this.projectsRepository.find({
      where: {
        isPublic: true,
        isDeleted: false,
      },
      relations: ['projectPackages', 'user'],
      order: {
        subNumber: 'DESC', // Sort by popularity
        createdAt: 'DESC', // Then by creation date
      },
      take: 50, // Limit results
    });
  }

  /**
   * Check if a user owns a project
   * @param project The project to check
   * @param userId The user ID to verify
   * @throws ForbiddenException if user is not the owner
   */
  private checkProjectOwnership(project: Project, userId: string): void {
    if (project.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to modify this project',
      );
    }
  }
}
