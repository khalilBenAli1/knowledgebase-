import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SignupDto {
  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'L\'email est obligatoire' })
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @IsNotEmpty({ message: 'Le mot de passe est obligatoire' })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  password: string;
}
