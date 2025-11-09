import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../../entities/event.entity';
import { EventFormField } from '../../entities/event-form-field.entity';
import { EventRegistration } from '../../entities/event-registration.entity';
import { EventRegistrationResponse } from '../../entities/event-registration-response.entity';
import { CreateEventDto } from '../../dto/create-event.dto';
import { RegisterEventDto } from '../../dto/register-event.dto';
import { User } from '../../entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../entities/notification.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
    @InjectRepository(EventFormField)
    private formFieldsRepository: Repository<EventFormField>,
    @InjectRepository(EventRegistration)
    private registrationsRepository: Repository<EventRegistration>,
    @InjectRepository(EventRegistrationResponse)
    private responsesRepository: Repository<EventRegistrationResponse>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private notificationsService: NotificationsService,
  ) {}

  async create(createEventDto: CreateEventDto, user: User): Promise<Event> {
    const event = this.eventsRepository.create({
      ...createEventDto,
      createdBy: user,
      formFields: createEventDto.formFields || [],
    });

    return await this.eventsRepository.save(event);
  }

  async findAll(user: User): Promise<Event[]> {
    const isHR = user.role.name === 'Responsable RH' ;

    if (isHR) {
      // HR can see all events
      return await this.eventsRepository.find({
        order: { createdAt: 'DESC' },
        relations: ['formFields', 'registrations', 'createdBy'],
      });
    } else {
      // Other users can only see published events
      return await this.eventsRepository.find({
        where: { published: true },
        order: { eventDate: 'ASC' },
        relations: ['formFields', 'createdBy'],
      });
    }
  }

  async findOne(id: string, user: User): Promise<Event> {
    const event = await this.eventsRepository.findOne({
      where: { id },
      relations: ['formFields', 'registrations', 'registrations.user', 'registrations.responses', 'registrations.responses.formField'],
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const isHR = user.role.name === 'Responsable RH' ;

    if (!event.published && !isHR) {
      throw new ForbiddenException('You do not have permission to view this event');
    }

    return event;
  }

  async update(id: string, updateEventDto: CreateEventDto, user: User): Promise<Event> {
    const event = await this.eventsRepository.findOne({
      where: { id },
      relations: ['formFields'],
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const isHR = user.role.name === 'Responsable RH' ;

    if (!isHR) {
      throw new ForbiddenException('Only HR can update events');
    }

    // Delete old form fields
    if (event.formFields && event.formFields.length > 0) {
      await this.formFieldsRepository.remove(event.formFields);
    }

    // Update event
    Object.assign(event, {
      title: updateEventDto.title,
      description: updateEventDto.description,
      eventDate: updateEventDto.eventDate,
      location: updateEventDto.location,
      imageUrl: updateEventDto.imageUrl,
    });

    // Add new form fields
    if (updateEventDto.formFields) {
      event.formFields = updateEventDto.formFields.map((field) =>
        this.formFieldsRepository.create({ ...field, event }),
      );
    }

    return await this.eventsRepository.save(event);
  }

  async publish(id: string, user: User): Promise<Event> {
    const event = await this.eventsRepository.findOne({ where: { id } });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const isHR = user.role.name === 'Responsable RH' ;

    if (!isHR) {
      throw new ForbiddenException('Only HR can publish events');
    }

    event.published = true;
    event.publishedAt = new Date();

    const publishedEvent = await this.eventsRepository.save(event);

    // Send notifications to all users
    const allUsers = await this.usersRepository.find();
    for (const notifyUser of allUsers) {
      await this.notificationsService.create(
        notifyUser.id,
        NotificationType.EVENT_PUBLISHED,
        'Nouvel événement',
        `Nouvel événement: ${event.title}`,
        { eventId: event.id, eventTitle: event.title },
        `/evenements/${event.id}`,
      );
    }

    return publishedEvent;
  }

  async unpublish(id: string, user: User): Promise<Event> {
    const event = await this.eventsRepository.findOne({ where: { id } });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const isHR = user.role.name === 'Responsable RH' ;

    if (!isHR) {
      throw new ForbiddenException('Only HR can unpublish events');
    }

    event.published = false;

    return await this.eventsRepository.save(event);
  }

  async delete(id: string, user: User): Promise<void> {
    const event = await this.eventsRepository.findOne({ where: { id } });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const isHR = user.role.name === 'Responsable RH' ;

    if (!isHR) {
      throw new ForbiddenException('Only HR can delete events');
    }

    await this.eventsRepository.remove(event);
  }

  async register(eventId: string, registerDto: RegisterEventDto, user: User): Promise<EventRegistration> {
    const event = await this.eventsRepository.findOne({
      where: { id: eventId },
      relations: ['formFields'],
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (!event.published) {
      throw new ForbiddenException('Cannot register for unpublished event');
    }

    // Check if user already registered
    let registration = await this.registrationsRepository.findOne({
      where: { event: { id: eventId }, user: { id: user.id } },
      relations: ['responses'],
    });

    if (registration) {
      // Update existing registration
      registration.status = registerDto.status;

      // Remove old responses
      if (registration.responses && registration.responses.length > 0) {
        await this.responsesRepository.remove(registration.responses);
      }
    } else {
      // Create new registration
      registration = this.registrationsRepository.create({
        event,
        user,
        status: registerDto.status,
      });
    }

    registration = await this.registrationsRepository.save(registration);

    // Save form responses if status is GOING
    if (registerDto.responses && registerDto.responses.length > 0) {
      const responses = registerDto.responses.map((response) =>
        this.responsesRepository.create({
          registration,
          formField: { id: response.formFieldId } as EventFormField,
          answer: response.answer,
        }),
      );

      await this.responsesRepository.save(responses);
    }

    // Reload with relations
    const updatedRegistration = await this.registrationsRepository.findOne({
      where: { id: registration.id },
      relations: ['responses', 'responses.formField'],
    });

    if (!updatedRegistration) {
      throw new NotFoundException('Registration not found after save');
    }

    return updatedRegistration;
  }

  async getMyRegistration(eventId: string, user: User): Promise<EventRegistration | null> {
    const registration = await this.registrationsRepository.findOne({
      where: { event: { id: eventId }, user: { id: user.id } },
      relations: ['responses', 'responses.formField'],
    });

    return registration || null;
  }

  async getEventStatistics(eventId: string, user: User): Promise<any> {
    const event = await this.eventsRepository.findOne({
      where: { id: eventId },
      relations: ['formFields', 'registrations', 'registrations.user', 'registrations.responses', 'registrations.responses.formField', 'registrations.responses.registration'],
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const isHR = user.role.name === 'Responsable RH' ;

    if (!isHR) {
      throw new ForbiddenException('Only HR can view event statistics');
    }

    // Filter out registrations with null/undefined users (deleted users)
    const validRegistrations = event.registrations.filter((r) => r.user && r.user.id);

    const interestedCount = validRegistrations.filter((r) => r.status === 'interested').length;
    const goingCount = validRegistrations.filter((r) => r.status === 'going').length;
    const notGoingCount = validRegistrations.filter((r) => r.status === 'not_going').length;

    // Calculate field statistics
    const fieldStats = {};
    event.formFields.forEach((field) => {
      const responses = validRegistrations
        .flatMap((r) => r.responses)
        .filter((res) => res.formField.id === field.id);

      if (field.fieldType === 'select' || field.fieldType === 'radio' || field.fieldType === 'checkbox') {
        // Count occurrences for option-based fields
        const counts = {};
        responses.forEach((res) => {
          const answer = res.answer;
          counts[answer] = (counts[answer] || 0) + 1;
        });
        fieldStats[field.id] = {
          label: field.label,
          type: field.fieldType,
          counts,
          totalResponses: responses.length,
        };
      } else {
        // List all responses for text-based fields
        fieldStats[field.id] = {
          label: field.label,
          type: field.fieldType,
          responses: responses
            .filter((res) => res.registration?.user)
            .map((res) => ({
              userId: res.registration.user.id,
              userName: res.registration.user.name,
              answer: res.answer,
            })),
          totalResponses: responses.length,
        };
      }
    });

    return {
      event: {
        id: event.id,
        title: event.title,
        eventDate: event.eventDate,
      },
      summary: {
        interested: interestedCount,
        going: goingCount,
        notGoing: notGoingCount,
        total: validRegistrations.length,
      },
      registrations: validRegistrations.map((r) => ({
        id: r.id,
        user: {
          id: r.user.id,
          name: r.user.name,
          email: r.user.email,
        },
        status: r.status,
        responses: r.responses.map((res) => ({
          fieldLabel: res.formField.label,
          answer: res.answer,
        })),
        createdAt: r.createdAt,
      })),
      fieldStatistics: fieldStats,
    };
  }
}
