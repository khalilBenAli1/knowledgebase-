import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Event } from './event.entity';

export enum FieldType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  SELECT = 'select',
  RADIO = 'radio',
  CHECKBOX = 'checkbox',
  NUMBER = 'number',
  DATE = 'date',
  EMAIL = 'email',
  PHONE = 'phone',
}

@Entity('event_form_fields')
export class EventFormField {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  label: string;

  @Column({
    type: 'enum',
    enum: FieldType,
    default: FieldType.TEXT,
  })
  fieldType: FieldType;

  @Column({ default: false })
  required: boolean;

  @Column('simple-array', { nullable: true })
  options: string[]; // For select, radio, checkbox

  @Column({ nullable: true })
  placeholder: string;

  @Column({ default: 0 })
  order: number;

  @ManyToOne(() => Event, (event) => event.formFields, { onDelete: 'CASCADE' })
  event: Event;

  @CreateDateColumn()
  createdAt: Date;
}
