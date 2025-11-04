import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  externalId?: string;

  @IsUUID()
  @IsNotEmpty()
  roleId: string;
}
