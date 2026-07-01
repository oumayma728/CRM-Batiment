import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateClientAccountDto {
  @ApiProperty({ example: 'Dupont', description: 'Nom du client' })
  @IsString()
  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  nom: string;

  @ApiProperty({ example: 'Jean', description: 'Prenom du client' })
  @IsString()
  @IsNotEmpty({ message: 'Le prenom est obligatoire' })
  prenom: string;

  @ApiProperty({ example: '0612345678', description: 'Telephone' })
  @IsString()
  @IsNotEmpty({ message: 'Le telephone est obligatoire' })
  telephone: string;

  @ApiProperty({
    example: 'jean.dupont@email.fr',
    description: 'Email du client',
  })
  @IsEmail({}, { message: "L'email doit etre valide" })
  @IsNotEmpty({ message: "L'email est obligatoire" })
  email: string;

  @ApiProperty({
    example: '12 Rue de Paris, 75001 Paris',
    description: 'Adresse personnelle du client',
  })
  @IsString()
  @IsNotEmpty({ message: "L'adresse client est obligatoire" })
  adresseClient: string;
}
