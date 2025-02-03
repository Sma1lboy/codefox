// Project Service for managing Projects
import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.model';
import { ProjectPackages } from './project-packages.model';
import { UpsertProjectInput } from './dto/project.input';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    @InjectRepository(ProjectPackages)
    private projectPackagesRepository: Repository<ProjectPackages>,
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

  async upsertProject(
    upsertProjectInput: UpsertProjectInput,
    userId: string,
  ): Promise<Project> {
    const { projectId, projectName, path, projectPackages } =
      upsertProjectInput;

    let project;
    if (projectId) {
      project = await this.projectsRepository.findOne({
        where: { id: projectId, isDeleted: false, userId },
        relations: ['projectPackages', 'chats'],
      });
    }

    if (project) {
      // Update existing project
      if (projectName) project.projectName = projectName;
      if (path) project.path = path;
    } else {
      // Create a new project if it does not exist
      project = this.projectsRepository.create({
        projectName,
        path,
        userId,
      });
      project = await this.projectsRepository.save(project);
    }

    // Add new project packages to existing ones
    if (projectPackages && projectPackages.length > 0) {
      const newPackages = projectPackages.map((content) => {
        return this.projectPackagesRepository.create({
          project: project,
          content: content,
        });
      });
      await this.projectPackagesRepository.save(newPackages);
    }

    // Return the updated or created project with all relations
    return await this.projectsRepository
      .findOne({
        where: { id: project.id, isDeleted: false },
        relations: ['projectPackages', 'chats', 'user'],
      })
      .then((project) => {
        if (project) {
          if (project.projectPackages) {
            project.projectPackages = project.projectPackages.filter(
              (pkg) => !pkg.isDeleted,
            );
          }
          if (project.chats) {
            project.chats = project.chats.filter((chat) => !chat.isDeleted);
          }
        }
        return project;
      });
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

  async removePackageFromProject(
    projectId: string,
    packageId: string,
  ): Promise<boolean> {
    const packageToRemove = await this.projectPackagesRepository.findOne({
      where: { id: packageId, project: { id: projectId } },
    });

    if (!packageToRemove) {
      throw new NotFoundException(
        `Package with ID ${packageId} not found for Project ID ${projectId}`,
      );
    }

    packageToRemove.isActive = false;
    packageToRemove.isDeleted = true;
    await this.projectPackagesRepository.save(packageToRemove);

    return true;
  }

  async updateProjectPath(
    projectId: string,
    newPath: string,
  ): Promise<boolean> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId, isDeleted: false },
      relations: ['projectPackages', 'chats'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found.`);
    }

    const result = await this.projectsRepository.update(projectId, {
      path: newPath,
    });
    return result.affected > 0;
  }
}
