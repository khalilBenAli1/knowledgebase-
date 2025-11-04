import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { FeedbackRating } from '../../../entities/feedback.entity';

export class CreateFeedbackDto {
  @IsUUID()
  @IsNotEmpty()
  messageId: string;

  @IsEnum(FeedbackRating)
  @IsNotEmpty()
  rating: FeedbackRating;

  @IsOptional()
  @IsString()
  comment?: string;
}
