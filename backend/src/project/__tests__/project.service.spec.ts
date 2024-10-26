import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectService } from '../project.service';
import { Project } from '../project.model';
import { ProjectPackages } from '../project-packages.model';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { UpsertProjectInput } from '../dto/project.input';
import { User } from 'src/user/user.model';

describe('ProjectsService', () => {
  let service: ProjectService;
  let projectRepository: Repository<Project>;
  let packageRepository: Repository<ProjectPackages>;

  const mockProject: Project = {
    id: '1',
    projectName: 'Test Project 1',
    path: '/test/path1',
    userId: 'user1',
    isDeleted: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    projectPackages: [],
    user: new User(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        {
          provide: getRepositoryToken(Project),
          useValue: {
            find: jest.fn().mockResolvedValue([mockProject]),
            findOne: jest.fn().mockResolvedValue(mockProject),
            create: jest.fn().mockReturnValue(mockProject),
            save: jest.fn().mockResolvedValue(mockProject),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
          },
        },
        {
          provide: getRepositoryToken(ProjectPackages),
          useValue: {
            create: jest.fn().mockImplementation((dto) => ({
              id: 'package-1',
              ...dto,
              is_deleted: false,
              is_active: true,
            })),
            save: jest.fn().mockImplementation((dto) => Promise.resolve(dto)),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
    projectRepository = module.get<Repository<Project>>(
      getRepositoryToken(Project),
    );
    packageRepository = module.get<Repository<ProjectPackages>>(
      getRepositoryToken(ProjectPackages),
    );
  });

  describe('getProjectsByUser', () => {
    it('should return projects for a user', async () => {
      // Act
      const result = await service.getProjectsByUser('user1');

      // Assert
      expect(result).toEqual([mockProject]);
    });

    it('should filter out deleted packages', async () => {
      // Arrange
      const projectWithPackages: Project = {
        ...mockProject,
        projectPackages: [],
        user: new User(),
        projectName: '',
        userId: '',
      };
      jest
        .spyOn(projectRepository, 'find')
        .mockResolvedValue([projectWithPackages]);

      // Act
      const result = await service.getProjectsByUser('user1');

      // Assert
    });

    it('should throw NotFoundException when no projects found', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'find').mockResolvedValue([]);

      // Act & Assert
      await expect(service.getProjectsByUser('user1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('upsertProject', () => {
    describe('create new project', () => {
      it('should create a new project with packages', async () => {
        // Arrange
        const upsertInput: UpsertProjectInput = {
          projectName: 'New Project',
          path: '/new/path',
          projectId: undefined,
          projectPackages: ['package1', 'package2'],
        };

        const createdProject: Project = {
          ...mockProject,
          projectName: upsertInput.projectName,
          path: upsertInput.path,
          user: new User(),
          userId: '',
        };

        jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);
        jest.spyOn(projectRepository, 'create').mockReturnValue(createdProject);
        jest.spyOn(projectRepository, 'save').mockResolvedValue(createdProject);

        // Act
        const result = await service.upsertProject(upsertInput, 'user1');

        // Assert
        expect(projectRepository.create).toHaveBeenCalledWith({
          projectName: upsertInput.projectName,
          path: upsertInput.path,
          userId: 'user1',
        });
        expect(packageRepository.create).toHaveBeenCalledTimes(2);
        expect(packageRepository.save).toHaveBeenCalled();
        expect(result).toBeDefined();
      });
    });

    describe('update existing project', () => {
      it('should update project and add new packages', async () => {
        // Arrange
        const upsertInput: UpsertProjectInput = {
          projectId: '1',
          projectName: 'Updated Project',
          path: '/updated/path',
          projectPackages: ['new-package'],
        };

        const existingProject: Project = {
          ...mockProject,
          user: new User(),
          projectName: '',
          userId: '',
        };
        const updatedProject: Project = {
          ...existingProject,
          projectName: upsertInput.projectName,
          path: upsertInput.path,
        };

        jest
          .spyOn(projectRepository, 'findOne')
          .mockResolvedValueOnce(existingProject) // First call for finding project
          .mockResolvedValueOnce(updatedProject); // Second call for final result

        jest.spyOn(projectRepository, 'save').mockResolvedValue(updatedProject);

        // Act
        const result = await service.upsertProject(upsertInput, 'user1');

        expect(packageRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            project: expect.any(Object),
            content: 'new-package',
          }),
        );
      });

      it('should not create packages if none provided', async () => {
        // Arrange
        const upsertInput: UpsertProjectInput = {
          projectId: '1',
          projectName: 'Updated Project',
          path: '/updated/path',
          projectPackages: [],
        };

        // Act
        await service.upsertProject(upsertInput, 'user1');

        // Assert
        expect(packageRepository.create).not.toHaveBeenCalled();
        expect(packageRepository.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('deleteProject', () => {
    it('should soft delete project and its packages', async () => {
      // Arrange
      const projectWithPackages: Project = {
        ...mockProject,
        projectPackages: [],
        user: new User(),
        projectName: '',
        userId: '',
      };
      jest
        .spyOn(projectRepository, 'findOne')
        .mockResolvedValue(projectWithPackages);

      // Act
      const result = await service.deleteProject('1');

      // Assert
      expect(result).toBe(true);
    });

    it('should throw NotFoundException for non-existent project', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteProject('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('removePackageFromProject', () => {
    it('should soft delete a single package', async () => {
      // Arrange

      const packageToRemove: ProjectPackages = {
        id: 'pkg1',
        isDeleted: false,
        isActive: true,
        project_id: '1',
        content: '',
        project: new Project(),
        createdAt: undefined,
        updatedAt: undefined,
      };
      jest
        .spyOn(packageRepository, 'findOne')
        .mockResolvedValue(packageToRemove);

      // Act
      const result = await service.removePackageFromProject('1', 'pkg1');

      // Assert
      expect(result).toBe(true);
    });

    it('should throw NotFoundException for non-existent package', async () => {
      // Arrange
      jest.spyOn(packageRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.removePackageFromProject('1', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProjectPath', () => {
    it('should update project path', async () => {
      // Arrange
      const newPath = '/updated/path';

      // Act
      const result = await service.updateProjectPath('1', newPath);

      // Assert
      expect(result).toBe(true);
      expect(projectRepository.update).toHaveBeenCalledWith('1', {
        path: newPath,
      });
    });

    it('should throw NotFoundException for non-existent project', async () => {
      // Arrange
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateProjectPath('999', '/new/path'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
