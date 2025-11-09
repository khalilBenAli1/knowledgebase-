import { IsUUID, IsString, IsOptional, MaxLength, IsDateString, ValidateIf } from 'class-validator';

export class CreateFormationRequestDto {
  // For catalog formations
  @IsUUID()
  @IsOptional()
  formationId?: string;

  // For custom formation requests
  @ValidateIf((o) => !o.formationId)
  @IsString()
  @MaxLength(255)
  customFormationTitle?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  customFormationDetails?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  customFormationLink?: string;

  @IsDateString()
  @IsOptional()
  customFormationDate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  requesterMessage?: string;
}
