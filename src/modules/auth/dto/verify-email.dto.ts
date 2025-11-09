import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @IsNotEmpty({ message: 'Le token est obligatoire' })
  @IsString()
  token: string;
}
