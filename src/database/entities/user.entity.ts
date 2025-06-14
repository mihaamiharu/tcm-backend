import { Exclude, Expose } from 'class-transformer';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';   

export type UserRole = 'ADMIN' | 'TESTER' | 'VIEWER';

@Exclude()
@Entity({
  name: 'users',
})
export class User {
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Expose()
  @Column({ unique: true })
  username: string;

  @Expose()
  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude ()
  passwordHash: string;

  @Expose()
  @Column({
    type: 'enum',
    enum: ['ADMIN', 'TESTER', 'VIEWER'],
    default: 'TESTER',
  })
  role: UserRole;

  @Expose()
  @CreateDateColumn()
  createdAt: Date;
  
  @Expose()
  @UpdateDateColumn()
  updatedAt: Date;
}