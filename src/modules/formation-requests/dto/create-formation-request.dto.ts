import { IsUUID, IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateFormationRequestDto {
  @IsUUID()
  formationId: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  requesterMessage?: string;
}
