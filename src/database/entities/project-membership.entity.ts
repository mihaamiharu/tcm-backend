import {
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne,
    Unique
  } from 'typeorm';
  import { Project } from './project.entity';
  import { User, UserRole } from './user.entity';
  
  @Entity({ name: 'project_memberships' })
  @Unique(['project', 'user']) // A user can only have one role per project
  export class ProjectMembership {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column({ type: 'enum', enum: ['ADMIN', 'TESTER', 'VIEWER'] })
    role: UserRole;
  
    @ManyToOne(() => Project, (project) => project.memberships, { onDelete: 'CASCADE' })
    project: Project;
  
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user: User;
  
    @CreateDateColumn()
    assignedAt: Date;
  }