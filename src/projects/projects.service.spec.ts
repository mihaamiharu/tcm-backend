import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Project } from '../database/entities/project.entity';
import { ProjectMembership } from '../database/entities/project-membership.entity';
import { EntityManager, Repository } from 'typeorm';
import { ConflictException, InternalServerErrorException } from '@nestjs/common';
import { User } from '../database/entities/user.entity';

// Mock the TypeORM repositories and EntityManager
const mockProjectRepository = {
  findOneBy: jest.fn(),
};

const mockTransactionalEntityManager = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
};

const mockEntityManager = {
  transaction: jest.fn().mockImplementation(async (callback) => {
    // This mock simulates the transaction by immediately calling the callback
    // with our mock transactional entity manager.
    return callback(mockTransactionalEntityManager);
  }),
};

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectRepository: Repository<Project>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepository,
        },
        {
          provide: EntityManager,
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    projectRepository = module.get<Repository<Project>>(getRepositoryToken(Project));

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createProjectDto = { name: 'New Project', description: 'A description' };
    const mockUser = { id: 'user-uuid' } as User;
    const mockProject = { id: 'project-uuid', ...createProjectDto };

    it('should create a project and a project membership successfully', async () => {
      mockProjectRepository.findOneBy.mockResolvedValue(null); // No existing project
      mockTransactionalEntityManager.create.mockImplementation((entity, data) => data);
      mockTransactionalEntityManager.save.mockResolvedValue(mockProject);
      mockTransactionalEntityManager.findOne.mockResolvedValue(mockProject);

      const result = await service.create(createProjectDto, mockUser);

      expect(result).toEqual(mockProject);
      expect(projectRepository.findOneBy).toHaveBeenCalledWith({ name: createProjectDto.name });
      expect(mockEntityManager.transaction).toHaveBeenCalled();
      expect(mockTransactionalEntityManager.save).toHaveBeenCalledTimes(2); // Once for Project, once for Membership
    });

    it('should throw a ConflictException if project name already exists', async () => {

      mockProjectRepository.findOneBy.mockResolvedValue(mockProject); // Project with name exists

      await expect(service.create(createProjectDto, mockUser)).rejects.toThrow(
        new ConflictException(`A project with the name "${createProjectDto.name}" already exists.`),
      );
    });
    
    it('should throw an error if reloading the project fails after creation', async () => {
      mockProjectRepository.findOneBy.mockResolvedValue(null);
      mockTransactionalEntityManager.create.mockImplementation((entity, data) => data);
      mockTransactionalEntityManager.save.mockResolvedValue(mockProject);
      mockTransactionalEntityManager.findOne.mockResolvedValue(null); 

      await expect(service.create(createProjectDto, mockUser)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});