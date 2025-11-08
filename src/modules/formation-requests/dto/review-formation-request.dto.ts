import { IsEnum, IsString, IsOptional, MaxLength } from 'class-validator';
import { FormationRequestStatus } from '../../../entities/formation-request.entity';

export class ReviewFormationRequestDto {
  @IsEnum(FormationRequestStatus)
  status: FormationRequestStatus.APPROVED | FormationRequestStatus.DECLINED;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  managerResponse?: string;
}
