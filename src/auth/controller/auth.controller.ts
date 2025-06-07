import { Controller, Post, Body, ValidationPipe } from "@nestjs/common";
import { AuthService } from "../auth.service";
import { RegisterUserDto } from "../dto/register-user.dto";


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body(new ValidationPipe()) registerUserDto: RegisterUserDto) {
    return this.authService.register(registerUserDto);
  }
}