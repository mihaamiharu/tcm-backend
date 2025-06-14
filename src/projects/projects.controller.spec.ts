import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';

// Mock the service
const mockProjectsService = {
  create: jest.fn(),
  remove: jest.fn(),
  listMembers: jest.fn(),
};

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let service: ProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
      ],
    })
      // We can also mock guards if we need to test complex guard logic,
      // but for now we trust they work and just verify they are applied.
      .overrideGuard(AuthGuard())
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<ProjectsController>(ProjectsController);
    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createProject', () => {
    it('should create a project successfully when user is an admin', async () => {
      const createProjectDto = { name: 'Test Project', description: 'A test project' };
      const mockUser = { id: 'user-uuid', role: 'ADMIN' } as any;
      const expectedResult = { id: 'project-uuid', ...createProjectDto, owner: mockUser };
      
      mockProjectsService.create.mockResolvedValue(expectedResult);

      const result = await controller.createProject(createProjectDto, mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.create).toHaveBeenCalledWith(createProjectDto, mockUser);
    });

    it('should throw an error if project creation fails', async () => {
      const createProjectDto = { name: 'Test Project', description: 'A test project' };
      const mockUser = { id: 'user-uuid', role: 'ADMIN' } as any;
      const errorMessage = 'Error creating project';

      mockProjectsService.create.mockRejectedValue(new Error(errorMessage));

      await expect(controller.createProject(createProjectDto, mockUser)).rejects.toThrow(Error);
      expect(service.create).toHaveBeenCalledWith(createProjectDto, mockUser);
    });

    it('should handle invalid input gracefully', async () => {
      // Assuming validation is handled by DTOs and pipes, this test verifies the controller's behavior with what might be passed
      // if validation was somehow bypassed or is part of the service logic.
      const createProjectDto = { name: '', description: '' }; // Invalid name
      const mockUser = { id: 'user-uuid', role: 'ADMIN' } as any;
      const errorMessage = 'Invalid input';

      mockProjectsService.create.mockRejectedValue(new Error(errorMessage));
      
      await expect(controller.createProject(createProjectDto, mockUser)).rejects.toThrow(Error);
      expect(service.create).toHaveBeenCalledWith(createProjectDto, mockUser);
    });
  });

  describe('remove', () => {
    const projectId = 'project-uuid';

    it('should call projectsService.remove with the correct id', async () => {
      // Arrange
      mockProjectsService.remove.mockResolvedValue(undefined); // Simulate successful deletion

      // Act
      await controller.remove(projectId);

      // Assert
      expect(service.remove).toHaveBeenCalledWith(projectId);
    });

    it('should not throw an error on successful deletion', async () => {
      // Arrange
      mockProjectsService.remove.mockResolvedValue(undefined);

      // Act & Assert
      await expect(controller.remove(projectId)).resolves.not.toThrow();
    });

    it('should throw an error if the service throws an error', async () => {
      // Arrange
      const errorMessage = 'Project not found';
      mockProjectsService.remove.mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(controller.remove(projectId)).rejects.toThrow(Error);
    });
  });

  describe('listMembers', () => {
    const projectId = 'project-uuid';
    const mockUser = { id: 'user-uuid' } as any;

    it('should call projectsService.listMembers with the correct arguments', async () => {
      mockProjectsService.listMembers.mockResolvedValue([]);
      await controller.listMembers(projectId, mockUser);
      expect(service.listMembers).toHaveBeenCalledWith(projectId, mockUser);
    });

    it('should return the result from the service', async () => {
      const expectedMembers = [{ id: 'member-uuid' }];
      mockProjectsService.listMembers.mockResolvedValue(expectedMembers);
      const result = await controller.listMembers(projectId, mockUser);
      expect(result).toEqual(expectedMembers);
    });

    it('should throw an error if the service throws an error', async () => {
      const errorMessage = 'Access Denied';
      mockProjectsService.listMembers.mockRejectedValue(new Error(errorMessage));
      await expect(controller.listMembers(projectId, mockUser)).rejects.toThrow(Error);
    });
  });
});