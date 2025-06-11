// src/auth/auth.controller.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../auth.service';
import { RegisterUserDto } from '../dto/register-user.dto';
import { LoginUserDto } from '../dto/login-user.dto';
import { PassportModule } from '@nestjs/passport';  

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  // Set up the testing module before each test
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService, 
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService); 
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register with the correct user data', async () => {
      const registerDto: RegisterUserDto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };
      
      mockAuthService.register.mockResolvedValue({ id: 'some-id', ...registerDto });
      await controller.register(registerDto);
      expect(service.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    it('should call authService.login with the correct user data', async () => {
      const loginDto: LoginUserDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      mockAuthService.login.mockResolvedValue({ accessToken: 'some-token' });
      await controller.login(loginDto);
      expect(service.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('getProfile', () => {
    it('should return the user object provided by the decorator', () => {
      const mockUser = {
        id: 'user-id',
        username: 'testuser',
        role: 'TESTER',
      };

      const result = controller.getProfile(mockUser);

      expect(result).toEqual(mockUser);
    });
  });
});