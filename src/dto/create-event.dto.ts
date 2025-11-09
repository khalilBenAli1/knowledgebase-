import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsEnum, IsBoolean, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { FieldType } from '../entities/event-form-field.entity';

export class CreateFormFieldDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsEnum(FieldType)
  fieldType: FieldType;

  @IsBoolean()
  @IsOptional()
  required?: boolean;

  @IsArray()
  @IsOptional()
  options?: string[];

  @IsString()
  @IsOptional()
  placeholder?: string;

  @IsOptional()
  order?: number;
}

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsDateString()
  eventDate: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFormFieldDto)
  @IsOptional()
  formFields?: CreateFormFieldDto[];
}
