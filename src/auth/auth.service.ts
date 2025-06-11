import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RegisterUserDto } from './dto/register-user.dto';
import * as bcrypt from 'bcrypt';
import { User } from '../database/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { LoginUserDto } from './dto/login-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService
  ) {}

  async register(registerUserDto: RegisterUserDto): Promise<Omit<User, 'passwordHash'>> {
    const { username, email, password } = registerUserDto;

    // 1. Check if user already exists
    const existingEmail = await this.usersService.findByEmail(email);
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    const existingUsername = await this.usersService.findByUsername(username);
    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = await this.usersService.create({
      username,
      email,
      passwordHash,
    });
    
    const { passwordHash: _, ...result } = newUser;
    return result;
  }

  async login(loginUserDto: LoginUserDto):Promise<{accessToken: string}> {
    const {email, password} = loginUserDto;

    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      const payload = {
        sub: user.id,
        username: user.username,
        role: user.role,
      };

      const accessToken = this.jwtService.sign(payload);
      return {
        accessToken
      };
    }
    throw new UnauthorizedException('Please check your login credentials');
  }
}