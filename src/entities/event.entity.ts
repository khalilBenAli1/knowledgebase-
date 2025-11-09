import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { EventFormField } from './event-form-field.entity';
import { EventRegistration } from './event-registration.entity';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({ type: 'timestamp' })
  eventDate: Date;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ default: false })
  published: boolean;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date;

  @ManyToOne(() => User, { eager: true })
  createdBy: User;

  @OneToMany(() => EventFormField, (field) => field.event, {
    cascade: true,
    eager: true,
  })
  formFields: EventFormField[];

  @OneToMany(() => EventRegistration, (registration) => registration.event)
  registrations: EventRegistration[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
