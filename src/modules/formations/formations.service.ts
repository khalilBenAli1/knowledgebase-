import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Formation } from '../../entities/formation.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class FormationsService {
  constructor(
    @InjectRepository(Formation)
    private formationsRepository: Repository<Formation>,
  ) {}

  async create(createData: { title: string; description: string; startDate: Date; endDate?: Date; imageUrl?: string }, user: User): Promise<Formation> {
    const formation = this.formationsRepository.create({
      ...createData,
      createdBy: user,
      published: false,
    });
    return this.formationsRepository.save(formation);
  }

  async findAll(published?: boolean): Promise<Formation[]> {
    const where: any = {};
    if (published !== undefined) {
      where.published = published;
    }
    return this.formationsRepository.find({
      where,
      order: { startDate: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Formation> {
    const formation = await this.formationsRepository.findOne({ where: { id } });
    if (!formation) {
      throw new NotFoundException(`Formation with ID ${id} not found`);
    }
    return formation;
  }

  async update(id: string, updateData: Partial<Formation>, user: User): Promise<Formation> {
    const formation = await this.findOne(id);

    // Only allow Gestionnaire RH to update
    if (user.role.name !== 'Gestionnaire RH') {
      throw new ForbiddenException('Only Gestionnaire RH can update formations');
    }

    Object.assign(formation, updateData);
    return this.formationsRepository.save(formation);
  }

  async publish(id: string, user: User): Promise<Formation> {
    return this.update(id, { published: true }, user);
  }

  async unpublish(id: string, user: User): Promise<Formation> {
    return this.update(id, { published: false }, user);
  }

  async remove(id: string, user: User): Promise<void> {
    const formation = await this.findOne(id);

    // Only allow Gestionnaire RH to delete
    if (user.role.name !== 'Gestionnaire RH') {
      throw new ForbiddenException('Only Gestionnaire RH can delete formations');
    }

    await this.formationsRepository.remove(formation);
  }
}
