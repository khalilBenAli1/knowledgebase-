import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Actuality } from '../../entities/actuality.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class ActualitiesService {
  constructor(
    @InjectRepository(Actuality)
    private actualitiesRepository: Repository<Actuality>,
  ) {}

  async create(createData: { title: string; description: string; imageUrl?: string }, user: User): Promise<Actuality> {
    const actuality = this.actualitiesRepository.create({
      ...createData,
      createdBy: user,
      published: false,
    });
    return this.actualitiesRepository.save(actuality);
  }

  async findAll(published?: boolean): Promise<Actuality[]> {
    const where: any = {};
    if (published !== undefined) {
      where.published = published;
    }
    return this.actualitiesRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Actuality> {
    const actuality = await this.actualitiesRepository.findOne({ where: { id } });
    if (!actuality) {
      throw new NotFoundException(`Actuality with ID ${id} not found`);
    }
    return actuality;
  }

  async update(id: string, updateData: Partial<Actuality>, user: User): Promise<Actuality> {
    const actuality = await this.findOne(id);

    // Only allow admins to update
    if (user.role.name !== 'Responsable RH' && user.role.name !== 'Gestionnaire RH') {
      throw new ForbiddenException('Only admins can update actualities');
    }

    Object.assign(actuality, updateData);
    return this.actualitiesRepository.save(actuality);
  }

  async publish(id: string, user: User): Promise<Actuality> {
    return this.update(id, { published: true }, user);
  }

  async unpublish(id: string, user: User): Promise<Actuality> {
    return this.update(id, { published: false }, user);
  }

  async remove(id: string, user: User): Promise<void> {
    const actuality = await this.findOne(id);

    // Only allow admins to delete
    if (user.role.name !== 'Responsable RH' && user.role.name !== 'Gestionnaire RH') {
      throw new ForbiddenException('Only admins can delete actualities');
    }

    await this.actualitiesRepository.remove(actuality);
  }
}
