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

@Injectable()
export class ProjectService {
  private readonly model: OpenAIModelProvider =
    OpenAIModelProvider.getInstance();
  private readonly logger = new Logger('ProjectService');
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    @InjectRepository(ProjectPackages)
    private projectPackagesRepository: Repository<ProjectPackages>,
  ) {}

  async getProjectsByUser(userId: number): Promise<Project[]> {
    const projects = await this.projectsRepository.find({
      where: { userId: userId, isDeleted: false },
      relations: ['projectPackages'],
    });
    if (projects && projects.length > 0) {
      projects.forEach((project) => {
        project.projectPackages = project.projectPackages.filter(
          (pkg) => !pkg.isDeleted,
        );
      });
    }

    if (!projects || projects.length === 0) {
      throw new NotFoundException(`User with ID ${userId} have no project.`);
    }
    return projects;
  }

  async getProjectById(projectId: string): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId, isDeleted: false },
      relations: ['projectPackages'],
    });
    if (project) {
      project.projectPackages = project.projectPackages.filter(
        (pkg) => !pkg.isDeleted,
      );
    }

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found.`);
    }
    return project;
  }

  // staring build the project
  async createProject(
    input: CreateProjectInput,
    userId: number,
  ): Promise<Project> {
    if (input.projectName === '') {
      this.logger.debug(
        'Project name not exist in input, generating project name',
      );
      const nameGenerationPrompt = await generateProjectNamePrompt(
        input.description,
      );
      const response = await this.model.chatSync({
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
      input.projectName = response;
      this.logger.debug(`Generated project name: ${input.projectName}`);
    }

    // Build project sequence and get project path
    const sequence = buildProjectSequenceByProject(input);
    const context = new BuilderContext(sequence, sequence.id);
    const projectPath = await context.execute();

    // Create new project entity
    const project = new Project();
    project.projectName = input.projectName;
    project.projectPath = projectPath;
    project.userId = userId;

    // Transform input packages to ProjectPackages entities
    const projectPackages = await this.transformInputToProjectPackages(
      input.packages,
    );
    project.projectPackages = projectPackages;

    try {
      return await this.projectsRepository.save(project);
    } catch (error) {
      this.logger.error('Error creating project:', error);
      throw new InternalServerErrorException('Error creating the project.');
    }
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
      throw new InternalServerErrorException(
        'Error processing project packages.',
      );
    }
  }

  async deleteProject(projectId: string): Promise<boolean> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found.`);
    }

    try {
      // Perform a soft delete by updating is_active and is_deleted fields
      project.isActive = false;
      project.isDeleted = true;
      await this.projectsRepository.save(project);

      // Perform a soft delete for related project packages
      const projectPackages = project.projectPackages;
      if (projectPackages && projectPackages.length > 0) {
        for (const pkg of projectPackages) {
          pkg.isActive = false;
          pkg.isDeleted = true;
          await this.projectPackagesRepository.save(pkg);
        }
      }

      return true;
    } catch (error) {
      throw new InternalServerErrorException('Error deleting the project.');
    }
  }

  async isValidProject(
    userId: number,
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
