import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateTaxonomyDto {
  @ApiProperty({ description: 'Display name of the taxonomy node', example: 'React' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Materialized Ltree path (dot-separated valid ltree identifiers)',
    example: 'technology.frontend.react',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)*$/, {
    message: 'Path must be a valid ltree format (dot-separated alphanumeric words with underscores, e.g. tech.frontend.react)',
  })
  path: string;
}
