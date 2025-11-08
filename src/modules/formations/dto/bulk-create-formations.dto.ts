import { IsString, IsDate, IsOptional, IsArray, ValidateNested, IsBoolean, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class FormationItemDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  @MaxLength(2000)
  description: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsBoolean()
  @IsOptional()
  published?: boolean;
}

export class BulkCreateFormationsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormationItemDto)
  formations: FormationItemDto[];
}
