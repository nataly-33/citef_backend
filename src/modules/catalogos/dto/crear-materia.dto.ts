import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsInt,
  Min,
  Max,
  IsPositive,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';

export class CarreraMateriaItemDto {
  @IsInt()
  @IsPositive()
  id_carrera: number;

  @IsInt()
  @Min(1)
  @Max(10)
  semestre_nivel: number;
}

export class CrearMateriaDto {
  @ApiProperty({
    example: 'MAT101',
    description: 'Sigla oficial de la materia (ej: MAT101, ADM200)',
  })
  @IsString({ message: 'La sigla debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La sigla de la materia es obligatoria' })
  @MaxLength(20, { message: 'La sigla no puede exceder los 20 caracteres' })
  sigla: string;

  @ApiProperty({
    example: 'Cálculo I',
    description: 'Nombre descriptivo de la asignatura',
  })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre de la materia es obligatorio' })
  @MaxLength(150, { message: 'El nombre no puede exceder los 150 caracteres' })
  nombre: string;

  @ApiPropertyOptional({
    example: 1,
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
    description: 'Lista de carreras y sus semestres asignados',
    type: [CarreraMateriaItemDto],
  })
  @IsOptional()
  @IsArray()
  carreras?: CarreraMateriaItemDto[];

  @ApiPropertyOptional({
    example: true,
    description: 'Estado activo/inactivo de la materia',
  })
  @IsOptional()
  @IsBoolean({ message: 'El campo activo debe ser booleano' })
  activo?: boolean;
}
