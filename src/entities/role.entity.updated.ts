import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export enum RoleName {
  USER = 'Collaborateur',
  MANAGER = 'Manager',  // NEW: Manager role
  HR_ADMIN = 'Gestionnaire RH',
  LEGAL_ADMIN = 'Responsable RH',
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
