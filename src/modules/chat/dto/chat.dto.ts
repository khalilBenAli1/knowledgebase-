import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class ChatDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsOptional()
  @IsUUID()
  sessionId?: string;
}
