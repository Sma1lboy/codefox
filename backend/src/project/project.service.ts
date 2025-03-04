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
  FetchPublicProjectsInputs,
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
import { UploadService } from 'src/upload/upload.service';
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
    private uploadService: UploadService,
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
    try {
      // First, handle project name generation if needed (this is the only sync operation we need)
      let projectName = input.projectName;
      if (!projectName || projectName === '') {
        this.logger.debug(
          'Project name not provided in input, generating project name',
        );

        const nameGenerationPrompt = await generateProjectNamePrompt(
          input.description,
        );
        const response = await this.model.chatSync({
          model: input.model || this.model.baseModel,
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

        projectName = response;
        this.logger.debug(`Generated project name: ${projectName}`);
      }

      // Create chat with proper title
      const defaultChat = await this.chatService.createChat(userId, {
        title: projectName || 'New Project Chat',
      });

      // Perform the rest of project creation asynchronously
      this.createProjectInBackground(input, projectName, userId, defaultChat);

      // Return chat immediately so user can start interacting
      return defaultChat;
    } catch (error) {
      this.logger.error(
        `Error in createProject: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error creating the project.');
    }
  }

  // Background task for project creation
  private async createProjectInBackground(
    input: CreateProjectInput,
    projectName: string,
    userId: string,
    chat: Chat,
  ): Promise<void> {
    try {
      // Build project sequence and execute
      const sequence = buildProjectSequenceByProject({
        ...input,
        projectName,
      });
      const context = new BuilderContext(sequence, sequence.id);
      const projectPath = await context.execute();

      // Create project entity and set properties
      const project = new Project();
      project.projectName = projectName;
      project.projectPath = projectPath;
      project.userId = userId;
      project.isPublic = input.public || false;
      project.uniqueProjectId = uuidv4();

      // Set project packages
      try {
        project.projectPackages = await this.transformInputToProjectPackages(
          input.packages,
        );
      } catch (packageError) {
        this.logger.error(`Error processing packages: ${packageError.message}`);
        // Continue even if packages processing fails
        project.projectPackages = [];
      }

      // Save project
      const savedProject = await this.projectsRepository.save(project);
      this.logger.debug(`Project created: ${savedProject.id}`);

      // Bind chat to project
      const bindSuccess = await this.bindProjectAndChat(savedProject, chat);
      if (!bindSuccess) {
        this.logger.error(
          `Failed to bind project and chat: ${savedProject.id} -> ${chat.id}`,
        );
      } else {
        this.logger.debug(
          `Project and chat bound: ${savedProject.id} -> ${chat.id}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error in background project creation: ${error.message}`,
        error.stack,
      );
      // No exception is thrown since this is a background task
    }
  }

  async transformInputToProjectPackages(
    inputPackages: ProjectPackage[],
  ): Promise<ProjectPackages[]> {
    try {
      if (!inputPackages || inputPackages.length === 0) {
        return [];
      }

      // Filter valid packages
      const validPackages = inputPackages.filter(
        (pkg) => pkg.name && pkg.name.trim() !== '',
      );

      if (validPackages.length === 0) {
        return [];
      }

      const packageNames = validPackages.map((pkg) => pkg.name);

      // Find existing packages by name (not by content)
      const existingPackages = await this.projectPackagesRepository.find({
        where: {
          name: In(packageNames),
        },
      });

      // Map by name, not content
      const existingPackagesMap = new Map(
        existingPackages.map((pkg) => [pkg.name, pkg]),
      );

      const transformedPackages = await Promise.all(
        validPackages.map(async (inputPkg) => {
          const existingPackage = existingPackagesMap.get(inputPkg.name);

          if (existingPackage) {
            // Update the existing package version if needed
            if (existingPackage.version !== inputPkg.version) {
              existingPackage.version = inputPkg.version || 'latest';
              return await this.projectPackagesRepository.save(existingPackage);
            }
            return existingPackage;
          }

          // Create a new package with required fields
          const newPackage = new ProjectPackages();
          newPackage.name = inputPkg.name; // Set name
          newPackage.content = inputPkg.name; // Set content to match name
          newPackage.version = inputPkg.version || 'latest';

          try {
            return await this.projectPackagesRepository.save(newPackage);
          } catch (err) {
            this.logger.error(`Error saving package: ${err.message}`);
            throw err; // Re-throw to handle it in the outer catch
          }
        }),
      ).catch((error) => {
        this.logger.error(
          `Error in Promise.all for packages: ${error.message}`,
        );
        return [];
      });

      return transformedPackages.filter(Boolean) as ProjectPackages[];
    } catch (error) {
      this.logger.error('Error transforming packages:', error);
      return [];
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
    file: Buffer,
    mimeType: string,
  ): Promise<Project> {
    const project = await this.getProjectById(projectId);

    // Check ownership permission
    this.checkProjectOwnership(project, userId);

    try {
      // Use the upload service to handle the file upload
      const subdirectory = `projects/${projectId}/images`;
      const uploadResult = await this.uploadService.upload(
        file,
        mimeType,
        subdirectory,
      );

      // Update the project with the new URL
      project.photoUrl = uploadResult.url;

      this.logger.debug(
        `Updated photo URL for project ${projectId} to ${uploadResult.url}`,
      );

      return this.projectsRepository.save(project);
    } catch (error) {
      this.logger.error('Error uploading image:', error);
      throw new InternalServerErrorException('Failed to upload image:', error);
    }
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

  /**
   * Fork an existing project to create a copy for the current user
   * @param userId The user ID making the request
   * @param projectId The project ID to fork
   * @returns The chat associated with the newly created project
   */
  async forkProject(userId: string, projectId: string): Promise<Chat> {
    try {
      this.logger.debug(`User ${userId} forking project ${projectId}`);

      // Get the source project
      const sourceProject = await this.getProjectById(projectId);

      // Check if the project is public or owned by the requesting user
      if (!sourceProject.isPublic && sourceProject.userId !== userId) {
        throw new ForbiddenException(
          'Cannot fork a private project you do not own',
        );
      }

      // Prevent users from forking their own projects
      if (sourceProject.userId === userId) {
        throw new ForbiddenException('Cannot fork your own project');
      }

      // Create default chat for the new project
      const defaultChat = await this.chatService.createChat(userId, {
        title: `Fork of ${sourceProject.projectName}`,
      });

      // Extract package information from source project
      const sourcePackages = sourceProject.projectPackages.map((pkg) => ({
        name: pkg.content,
        version: pkg.version,
      }));

      // Create a new project entity
      const newProject = new Project();
      newProject.projectName = `Fork of ${sourceProject.projectName}`;
      newProject.projectPath = sourceProject.projectPath; // Backend will handle path as needed
      newProject.userId = userId;
      newProject.isPublic = false; // Default to private
      newProject.uniqueProjectId = uuidv4(); // Generate new unique ID
      newProject.forkedFromId = sourceProject.uniqueProjectId; // Reference the original
      newProject.photoUrl = sourceProject.photoUrl; // Copy screenshot if available

      // Set project packages
      newProject.projectPackages =
        await this.transformInputToProjectPackages(sourcePackages);

      // Save the new project
      const savedProject = await this.projectsRepository.save(newProject);

      // Increment the source project's subscription count
      sourceProject.subNumber += 1;
      await this.projectsRepository.save(sourceProject);

      // Bind chat to the new project
      await this.bindProjectAndChat(savedProject, defaultChat);

      return defaultChat;
    } catch (error) {
      this.logger.error(`Error forking project: ${error.message}`, error.stack);
      throw error instanceof ForbiddenException
        ? error
        : new InternalServerErrorException('Error forking the project.');
    }
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

  async fetchPublicProjects(
    input: FetchPublicProjectsInputs,
  ): Promise<Project[]> {
    const limit = input.size > 50 ? 50 : input.size;

    const whereCondition = {
      isPublic: true,
      isDeleted: false,
    };

    if (input.strategy === 'latest') {
      return this.projectsRepository.find({
        where: whereCondition,
        order: { createdAt: 'DESC' },
        take: limit,
        relations: ['projectPackages', 'user'],
      });
    } else if (input.strategy === 'trending') {
      const totalCount = await this.projectsRepository.count({
        where: whereCondition,
      });
      const topCount = Math.max(1, Math.ceil(totalCount * 0.01));
      const take = Math.min(limit, topCount);
      return this.projectsRepository.find({
        where: whereCondition,
        order: { subNumber: 'DESC', createdAt: 'DESC' },
        take,
        relations: ['projectPackages', 'user'],
      });
    }

    return [];
  }
}
