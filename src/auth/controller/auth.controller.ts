import { Controller, Post, Body, ValidationPipe, Get, UseGuards } from "@nestjs/common";
import { AuthService } from "../auth.service";
import { RegisterUserDto } from "../dto/register-user.dto";
import { LoginUserDto } from "../dto/login-user.dto";
import { GetUser } from "../decorators/get-user.decorator";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";

type AuthenticatedUser = {
  id: string;
  username: string;
  role: string;
};

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body(new ValidationPipe()) registerUserDto: RegisterUserDto) {
    return this.authService.register(registerUserDto);
  }

  @Post('login')
  async login(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@GetUser() user: AuthenticatedUser) {
    return user;
  }
}