import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { Event } from './event.entity';
import { User } from './user.entity';
import { EventRegistrationResponse } from './event-registration-response.entity';

export enum RegistrationStatus {
  INTERESTED = 'interested',
  GOING = 'going',
  NOT_GOING = 'not_going',
}

@Entity('event_registrations')
@Unique(['event', 'user'])
export class EventRegistration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Event, (event) => event.registrations, { onDelete: 'CASCADE' })
  event: Event;

  @ManyToOne(() => User, { eager: true })
  user: User;

  @Column({
    type: 'enum',
    enum: RegistrationStatus,
    default: RegistrationStatus.INTERESTED,
  })
  status: RegistrationStatus;

  @OneToMany(() => EventRegistrationResponse, (response) => response.registration, {
    cascade: true,
    eager: true,
  })
  responses: EventRegistrationResponse[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
