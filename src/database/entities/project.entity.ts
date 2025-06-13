import {
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
    ManyToOne, OneToMany,
    Unique
  } from 'typeorm';
  import { User } from './user.entity';
  import { ProjectMembership } from './project-membership.entity';
  
  @Entity({ name: 'projects' })
  @Unique(['name']) 
  export class Project {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column()
    name: string;
  
    @Column({ type: 'text', nullable: true })
    description: string;
  
    @ManyToOne(() => User, { nullable: false, eager: true })
    creator: User;
  
    @OneToMany(() => ProjectMembership, (membership) => membership.project)
    memberships: ProjectMembership[];
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }