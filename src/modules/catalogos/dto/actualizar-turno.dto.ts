import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsPositive,
  IsString,
  MaxLength,
  IsDateString,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class ActualizarTurnoDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'ID de la franja horaria operativa',
  })
  @IsOptional()
  @IsInt({ message: 'El ID de horario debe ser un número entero' })
  @IsPositive({ message: 'El ID de horario debe ser un número positivo' })
  id_horario?: number;

  @ApiPropertyOptional({
    example: '1-2026',
    description: 'Semestre académico de la asignación',
  })
  @IsOptional()
  @IsString({ message: 'El semestre debe ser una cadena de texto' })
  @MaxLength(20, { message: 'El semestre no puede exceder los 20 caracteres' })
  semestre?: string;

  @ApiPropertyOptional({
    example: '2026-02-01',
    description: 'Fecha de inicio del periodo semestral',
  })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de inicio debe tener formato YYYY-MM-DD válido' })
  fecha_inicio?: string;

  @ApiPropertyOptional({
    example: '2026-07-31',
    description: 'Fecha de finalización del periodo semestral',
  })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de fin debe tener formato YYYY-MM-DD válido' })
  fecha_fin?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Estado activo de la asignación',
  })
  @IsOptional()
  @IsBoolean({ message: 'El campo activo debe ser booleano' })
  activo?: boolean;
}
