import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'admin@batiment-pro.fr',
    description: 'Email du compte pour lequel reinitialiser le mot de passe',
  })
  @IsEmail({}, { message: "L'email doit etre valide" })
  @IsNotEmpty({ message: "L'email est obligatoire" })
  email: string;
}
