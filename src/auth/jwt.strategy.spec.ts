// src/auth/jwt.strategy.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_SECRET') {
                return 'test-secret';
              }
              return null;
            }),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return the user payload if validation is successful', async () => {
      const payload = { sub: 'user-id', username: 'testuser', role: 'TESTER' };
      const expectedUser = { id: 'user-id', username: 'testuser', role: 'TESTER' };

      const result = await strategy.validate(payload);

      expect(result).toEqual(expectedUser);
    });

    it('should throw an UnauthorizedException if payload is missing sub (userId)', async () => {
      const invalidPayload = { username: 'testuser', role: 'TESTER' }; // Missing 'sub'

      await expect(strategy.validate(invalidPayload as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});