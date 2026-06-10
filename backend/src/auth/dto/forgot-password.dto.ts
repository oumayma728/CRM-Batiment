import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'admin@batiment.fr',
    description: "Email de l'utilisateur",
  })
  @IsEmail({}, { message: "L'email doit etre valide" })
  @IsNotEmpty({ message: "L'email est obligatoire" })
  email: string;

  @ApiProperty({
    example: 'MonNouveauMdp123!',
    description: 'Nouveau mot de passe',
  })
  @IsString()
  @IsNotEmpty({ message: 'Le nouveau mot de passe est obligatoire' })
  @MinLength(8, { message: 'Le mot de passe doit faire au moins 8 caracteres' })
  newPassword: string;
}
