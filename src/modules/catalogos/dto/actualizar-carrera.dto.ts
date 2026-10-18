import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, IsOptional, IsBoolean } from 'class-validator';

export class ActualizarCarreraDto {
  @ApiPropertyOptional({
    example: '186-5',
    description: 'Código oficial de la carrera en la FCEE - UAGRM',
  })
  @IsOptional()
  @IsString({ message: 'El código debe ser una cadena de texto' })
  @MaxLength(20, { message: 'El código no puede exceder los 20 caracteres' })
  codigo?: string;

  @ApiPropertyOptional({
    example: 'Ingeniería Comercial',
    description: 'Nombre descriptivo de la carrera profesional',
  })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @MaxLength(100, { message: 'El nombre no puede exceder los 100 caracteres' })
  nombre?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Estado activo/inactivo de la carrera',
  })
  @IsOptional()
  @IsBoolean({ message: 'El campo activo debe ser booleano' })
  activo?: boolean;
}
