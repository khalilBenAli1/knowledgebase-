import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../entities/role.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
  ) {}

  async findAll(): Promise<Role[]> {
    return this.rolesRepository.find();
  }

  async findById(id: string): Promise<Role | null> {
    return this.rolesRepository.findOne({ where: { id } });
  }

  async findByName(name: string): Promise<Role | null> {
    return this.rolesRepository.findOne({ where: { name: name as any } });
  }
}
