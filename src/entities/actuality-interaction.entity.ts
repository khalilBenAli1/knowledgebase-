import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Actuality } from './actuality.entity';

export enum InteractionType {
  VIEW = 'view',
  LIKE = 'like',
}

@Entity('actuality_interactions')
export class ActualityInteraction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  actualityId: string;

  @ManyToOne(() => Actuality, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'actualityId' })
  actuality: Actuality;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: InteractionType,
  })
  type: InteractionType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
