import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Project } from '../database/entities/project.entity';
import { ProjectMembership } from '../database/entities/project-membership.entity';
import { EntityManager, Repository } from 'typeorm';
import {
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { User } from '../database/entities/user.entity';

const mockProjectRepository = {
  findOneBy: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  merge: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(),
  delete: jest.fn(),
};

const mockMembershipRepository = {
  findOneBy: jest.fn(),
  find: jest.fn(),
};

const mockTransactionalEntityManager = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
};

const mockEntityManager = {
  transaction: jest.fn().mockImplementation(async (callback) =>
    // This mock simulates a transaction by immediately calling the callback
    // with our mock transactional entity manager.
    callback(mockTransactionalEntityManager),
  ),
};

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectRepository: Repository<Project>;
  let membershipRepository: Repository<ProjectMembership>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepository,
        },
        {
          provide: getRepositoryToken(ProjectMembership),
          useValue: mockMembershipRepository,
        },
        {
          provide: EntityManager,
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    projectRepository = module.get<Repository<Project>>(
      getRepositoryToken(Project),
    );
    membershipRepository = module.get<Repository<ProjectMembership>>(
      getRepositoryToken(ProjectMembership),
    );

    // Clear all mocks before each test to ensure test isolation
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // --- Tests for the 'create' method ---
  describe('create', () => {
    const createProjectDto = { name: 'New Project', description: 'A description' };
    const mockUser = { id: 'user-uuid', role: 'ADMIN' } as User;
    const mockProject = { id: 'project-uuid', ...createProjectDto };

    it('should successfully create a project and its membership', async () => {
      mockProjectRepository.findOneBy.mockResolvedValue(null);
      mockTransactionalEntityManager.create.mockImplementation((_, data) => data);
      mockTransactionalEntityManager.save.mockResolvedValue(mockProject);
      mockTransactionalEntityManager.findOne.mockResolvedValue(mockProject);

      const result = await service.create(createProjectDto, mockUser);

      expect(result).toEqual(mockProject);
      expect(projectRepository.findOneBy).toHaveBeenCalledWith({ name: createProjectDto.name });
      expect(mockEntityManager.transaction).toHaveBeenCalled();
      expect(mockTransactionalEntityManager.save).toHaveBeenCalledTimes(2);
    });

    it('should throw ConflictException if a project with the same name already exists', async () => {
      mockProjectRepository.findOneBy.mockResolvedValue(mockProject);
      await expect(service.create(createProjectDto, mockUser)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw InternalServerErrorException if the transaction fails', async () => {
        mockProjectRepository.findOneBy.mockResolvedValue(null);
        mockEntityManager.transaction.mockImplementation(async (callback) => {
            const transactionalEntityManager = {
                create: jest.fn().mockImplementation((_, data) => data),
                save: jest.fn().mockRejectedValue(new Error('DB error')),
            };
            // The callback is expected to throw an error which the transaction block should catch and handle.
            await callback(transactionalEntityManager);
        });

        await expect(service.create(createProjectDto, mockUser)).rejects.toThrow(InternalServerErrorException);
    });
  });

  // --- Tests for the 'findAllForUser' method ---
  describe('findAllForUser', () => {
    const mockUser = { id: 'user-uuid', role: 'TESTER' } as User;
    const mockAdmin = { id: 'admin-uuid', role: 'ADMIN' } as User;

    it('should return all projects for an ADMIN user', async () => {
      mockProjectRepository.find.mockResolvedValue(['project1', 'project2'] as any);
      const result = await service.findAllForUser(mockAdmin);
      expect(projectRepository.find).toHaveBeenCalled();
      expect(result).toEqual(['project1', 'project2']);
    });

    it('should return only projects the user is a member of for a non-admin user', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(['project1']),
      };
      mockProjectRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.findAllForUser(mockUser);
      expect(projectRepository.createQueryBuilder).toHaveBeenCalledWith('project');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'membership.userId = :userId',
        { userId: mockUser.id },
      );
      expect(result).toEqual(['project1']);
    });
  });

  // --- Tests for the 'findOneByIdForUser' method ---
  describe('findOneByIdForUser', () => {
    const mockUser = { id: 'user-uuid', role: 'TESTER' } as User;
    const projectId = 'project-uuid';

    it('should return a project when the user is a member', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: projectId }),
      };
      mockProjectRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.findOneByIdForUser(projectId, mockUser);
      expect(result).toBeDefined();
      expect(result.id).toBe(projectId);
    });

    it('should throw NotFoundException if the project is not found or the user is not a member', async () => {
        const mockQueryBuilder = {
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            innerJoin: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(null), // Simulate no project found for this user
          };
          mockProjectRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

          await expect(service.findOneByIdForUser(projectId, mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  // --- Tests for the 'update' method ---
  describe('update', () => {
    const mockUser = { id: 'user-uuid', role: 'TESTER' } as User;
    const mockAdmin = { id: 'admin-uuid', role: 'ADMIN' } as User;
    const projectId = 'project-uuid';
    const updateDto = { name: 'Updated Project Name' };
    const mockProject = { id: projectId, name: 'Original Name' };

    beforeEach(() => {
        // Mock the service's own find method to simplify update tests
        jest.spyOn(service, 'findOneByIdForUser').mockResolvedValue(mockProject as any);
    });

    it('should successfully update a project for a system admin', async () => {
      mockProjectRepository.findOne.mockResolvedValue(null);
      mockProjectRepository.merge.mockReturnValue({ ...mockProject, ...updateDto });
      mockProjectRepository.save.mockResolvedValue({ ...mockProject, ...updateDto });

      const result = await service.update(projectId, updateDto, mockAdmin);

      expect(result.name).toEqual(updateDto.name);
      expect(projectRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for a non-admin member attempting to update', async () => {
      mockMembershipRepository.findOneBy.mockResolvedValue({ role: 'TESTER' });

      await expect(service.update(projectId, updateDto, mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ConflictException if updated project name is already taken', async () => {
      mockProjectRepository.findOne.mockResolvedValue({ id: 'another-uuid', name: updateDto.name });
      
      await expect(service.update(projectId, updateDto, mockAdmin)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    const projectId = 'a-uuid';

    it('should successfully delete a project if it exists', async () => {
      mockProjectRepository.delete.mockResolvedValue({ affected: 1 });

      await expect(service.remove(projectId)).resolves.not.toThrow();
      expect(projectRepository.delete).toHaveBeenCalledWith(projectId);
    });

    it('should throw NotFoundException if the project to delete is not found', async () => {
      mockProjectRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.remove(projectId)).rejects.toThrow(NotFoundException);
      expect(projectRepository.delete).toHaveBeenCalledWith(projectId);
    });

    it('should throw an error if the repository throws an error', async () => {
      const errorMessage = 'Database error';
      mockProjectRepository.delete.mockRejectedValue(new Error(errorMessage));

      await expect(service.remove(projectId)).rejects.toThrow(Error);
    });
  });

  describe('listMembers', () => {
    const projectId = 'project-uuid';
    const adminUser = { id: 'admin-uuid', role: 'ADMIN' } as User;
    const testerUser = { id: 'tester-uuid', role: 'TESTER' } as User;

    it('should allow an ADMIN to list members without a membership check', async () => {
      const expectedMembers = [{ id: 'membership-uuid' }];
      mockMembershipRepository.find.mockResolvedValue(expectedMembers);
      
      const result = await service.listMembers(projectId, adminUser);
      
      expect(mockMembershipRepository.findOneBy).not.toHaveBeenCalled();
      expect(mockMembershipRepository.find).toHaveBeenCalledWith({
        where: { project: { id: projectId } },
        relations: ['user'],
      });
      expect(result).toEqual(expectedMembers);
    });

    it('should allow a project member to list members', async () => {
      const existingMembership = { id: 'membership-uuid' };
      mockMembershipRepository.findOneBy.mockResolvedValue(existingMembership);
      const expectedMembers = [existingMembership];
      mockMembershipRepository.find.mockResolvedValue(expectedMembers);

      const result = await service.listMembers(projectId, testerUser);

      expect(mockMembershipRepository.findOneBy).toHaveBeenCalledWith({
        project: { id: projectId },
        user: { id: testerUser.id },
      });
      expect(mockMembershipRepository.find).toHaveBeenCalledWith({
        where: { project: { id: projectId } },
        relations: ['user'],
      });
      expect(result).toEqual(expectedMembers);
    });

    it('should throw ForbiddenException if a non-admin is not a project member', async () => {
      mockMembershipRepository.findOneBy.mockResolvedValue(null);

      await expect(service.listMembers(projectId, testerUser)).rejects.toThrow(ForbiddenException);
      expect(mockMembershipRepository.find).not.toHaveBeenCalled();
    });
  });
});