import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Project } from '../database/entities/project.entity';
import { ProjectMembership } from '../database/entities/project-membership.entity';
import { CreateProjectDto } from '../auth/dto/create-project.dto';
import { User } from '../database/entities/user.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly entityManager: EntityManager,
  ) {}

  async create(createProjectDto: CreateProjectDto, creator: User): Promise<Project> {
    const existingProject = await this.projectRepository.findOneBy({ name: createProjectDto.name });
    if (existingProject) {
      throw new ConflictException(`A project with the name "${createProjectDto.name}" already exists.`);
    }

    return this.entityManager.transaction(async (transactionalEntityManager) => {
      const newProject = transactionalEntityManager.create(Project, {
        ...createProjectDto,
        creator,
      });
      const savedProject = await transactionalEntityManager.save(newProject);

      const membership = transactionalEntityManager.create(ProjectMembership, {
        project: savedProject,
        user: creator,
        role: 'ADMIN',
      });
      await transactionalEntityManager.save(membership);

      const reloadedProject = await transactionalEntityManager.findOne(Project, {
        where: { id: savedProject.id },
        relations: ['creator'],
      });
      if (!reloadedProject) {
        throw new InternalServerErrorException('Failed to reload project after creation.');
      }
      return reloadedProject;
    });
  }

  async findAllForUser(user: User): Promise<Project[]> {
    // If the user is a system-wide ADMIN, return all projects.
    if (user.role === 'ADMIN') {
      return this.projectRepository.find({
        relations: ['creator'],
      });
    }

    // Otherwise, return only the projects they are a member of.
    return this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.creator', 'creator')
      .innerJoin('project.memberships', 'membership')
      .where('membership.userId = :userId', { userId: user.id })
      .getMany();
  }

  async findOneByIdForUser(id: string, user: User): Promise<Project> {
    const queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.creator', 'creator')
      .where('project.id = :id', { id });

    // If the user is not a system Admin, scope the query to their memberships.
    if (user.role !== 'ADMIN') {
      queryBuilder
        .innerJoin('project.memberships', 'membership')
        .andWhere('membership.userId = :userId', { userId: user.id });
    }

    const project = await queryBuilder.getOne();

    if (!project) {
      throw new NotFoundException(`Project with ID "${id}" not found or you do not have access.`);
    }

    return project;
  }
}