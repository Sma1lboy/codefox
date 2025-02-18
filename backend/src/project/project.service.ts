// Project Service for managing Projects
import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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
      projects.forEach((project) => {
        // Filter deleted packages
        project.projectPackages = project.projectPackages.filter(
          (pkg) => !pkg.isDeleted,
        );
        // Filter deleted chats
        if (project.chats) {
          project.chats = project.chats.filter((chat) => !chat.isDeleted);
        }
      });
    }

    if (!projects || projects.length === 0) {
      throw new NotFoundException(`User with ID ${userId} has no projects.`);
    }
    return projects;
  }

  async getProjectById(projectId: string): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId, isDeleted: false },
      relations: ['projectPackages', 'chats', 'user'],
    });

    if (project) {
      project.projectPackages = project.projectPackages.filter(
        (pkg) => !pkg.isDeleted,
      );
      if (project.chats) {
        project.chats = project.chats.filter((chat) => !chat.isDeleted);
      }
    }

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found.`);
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
      if (!project.chats) {
        project.chats = [];
      }
      const chatArray = await project.chats;
      chatArray.push(chat);
      console.log(chat);
      console.log(project);
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
          model: 'gpt-4o',
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
}
