import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateClientPortalDemandeDto {
  @ApiProperty({
    example: 'Je souhaite refaire ma salle de bain et recevoir un devis.',
    description: 'Description du besoin exprime par le client connecte',
  })
  @IsString()
  @IsNotEmpty({ message: 'La description est obligatoire' })
  @MinLength(10, { message: 'La description doit contenir au moins 10 caracteres' })
  @MaxLength(2000, { message: 'La description ne doit pas depasser 2000 caracteres' })
  description: string;
}
