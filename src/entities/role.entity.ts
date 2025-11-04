import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export enum RoleName {
  USER = 'User',
  HR_ADMIN = 'HR Admin',
  LEGAL_ADMIN = 'Legal Admin',
  IT_ADMIN = 'IT Admin',
}

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  name: RoleName;

  @Column({ type: 'jsonb', default: {} })
  permissions: Record<string, boolean>;

  @CreateDateColumn()
  createdAt: Date;
}
