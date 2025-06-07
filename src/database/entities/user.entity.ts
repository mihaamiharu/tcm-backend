import { Exclude } from 'class-transformer';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';   

export type UserRole = 'ADMIN' | 'TESTER' | 'VIEWER';

@Entity({
  name: 'users',
})
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude ()
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: ['ADMIN', 'TESTER', 'VIEWER'],
    default: 'TESTER',
  })
  role: UserRole;


  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}