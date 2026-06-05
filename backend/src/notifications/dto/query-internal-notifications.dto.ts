import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class QueryInternalNotificationsDto {
  @ApiPropertyOptional({
    example: 8,
    description: 'Nombre maximum de notifications a retourner',
    default: 8,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 8;
}
