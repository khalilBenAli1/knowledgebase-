import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { EventRegistration } from './event-registration.entity';
import { EventFormField } from './event-form-field.entity';

@Entity('event_registration_responses')
export class EventRegistrationResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => EventRegistration, (registration) => registration.responses, {
    onDelete: 'CASCADE',
  })
  registration: EventRegistration;

  @ManyToOne(() => EventFormField, { eager: true })
  formField: EventFormField;

  @Column('text')
  answer: string; // Store answer as text (can be JSON for multiple values)

  @CreateDateColumn()
  createdAt: Date;
}
