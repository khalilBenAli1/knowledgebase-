import { IsEnum, IsOptional, IsArray, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { RegistrationStatus } from '../entities/event-registration.entity';

export class FormResponseDto {
  @IsString()
  formFieldId: string;

  @IsString()
  answer: string;
}

export class RegisterEventDto {
  @IsEnum(RegistrationStatus)
  status: RegistrationStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormResponseDto)
  @IsOptional()
  responses?: FormResponseDto[];
}
