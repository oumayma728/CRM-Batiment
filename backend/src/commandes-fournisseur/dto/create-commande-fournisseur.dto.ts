import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateCommandeFournisseurDto {
  @ApiProperty({ description: 'ID du fournisseur' })
  @IsInt()
  fournisseurId: number;

  @ApiProperty({ description: 'ID du devis (optionnel)' })
  @IsOptional()
  @IsInt()
  devisId?: number;

  @ApiProperty({ description: 'Date de livraison prévue' })
  @IsOptional()
  @IsDateString()
  dateLivraisonPrevue?: string;

  @ApiProperty({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Lignes de commande' })
  lignes: any[];
}
