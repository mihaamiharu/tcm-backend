import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor() {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    // If we have a user, return it
    if (user) {
      return user;
    }

    // If we have an error, throw it
    if (err) {
      throw new UnauthorizedException(err.message);
    }

    // If we have no user and no error, throw a generic unauthorized
    throw new UnauthorizedException('Invalid token');
  }
} 