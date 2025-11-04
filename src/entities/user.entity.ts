import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Role } from './role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ nullable: true })
  passwordHash: string;

  @Column({ nullable: true })
  externalId: string;

  @Column({ type: 'uuid' })
  roleId: string;

  @ManyToOne(() => Role, { eager: true })
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
