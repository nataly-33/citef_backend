import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MaxLength,
  IsInt,
  Min,
  Max,
  IsPositive,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class ActualizarMateriaDto {
  @ApiPropertyOptional({
    example: 'MAT101',
    description: 'Sigla oficial de la materia',
  })
  @IsOptional()
  @IsString({ message: 'La sigla debe ser una cadena de texto' })
  @MaxLength(20, { message: 'La sigla no puede exceder los 20 caracteres' })
  sigla?: string;

  @ApiPropertyOptional({
    example: 'Cálculo I',
    description: 'Nombre descriptivo de la asignatura',
  })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @MaxLength(150, { message: 'El nombre no puede exceder los 150 caracteres' })
  nombre?: string;

  @ApiPropertyOptional({
    example: 2,
    description: 'Semestre o nivel curricular (del 1 al 10)',
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsInt({ message: 'El semestre nivel debe ser un número entero' })
  @Min(1, { message: 'El semestre nivel mínimo es 1' })
  @Max(10, { message: 'El semestre nivel máximo es 10' })
  semestre_nivel?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID de la carrera a la que pertenece la materia',
  })
  @IsOptional()
  @IsInt({ message: 'El ID de la carrera debe ser un número entero' })
  @IsPositive({ message: 'El ID de la carrera debe ser positivo' })
  id_carrera?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Estado activo/inactivo de la materia',
  })
  @IsOptional()
  @IsBoolean({ message: 'El campo activo debe ser booleano' })
  activo?: boolean;
}
