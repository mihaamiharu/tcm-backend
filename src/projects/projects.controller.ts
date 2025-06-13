import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CreateProjectDto } from 'src/auth/dto/create-project.dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ProjectsService } from './projects.service';
import { User } from 'src/database/entities/user.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';


@Controller({
    path: 'projects',
    version: '1',
  })
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) {}
  
    @Post()
    @Roles('ADMIN')
    createProject(
      @Body() createProjectDto: CreateProjectDto,
      @GetUser() user: User,
    ) {
      return this.projectsService.create(createProjectDto, user);
    }

    @Get()
    findAll(@GetUser() user: User) {
        return this.projectsService.findAllForUser(user);
    }

    @Get(':id')
    findOne(
        @Param('id', ParseUUIDPipe) id: string,
        @GetUser() user: User,
    ) {
        return this.projectsService.findOneByIdForUser(id, user);
    }
  }