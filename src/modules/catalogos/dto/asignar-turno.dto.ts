import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsInt,
  IsPositive,
  IsString,
  MaxLength,
  IsDateString,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class AsignarTurnoDto {
  @ApiProperty({
    example: 4,
    description:
      'ID del usuario auxiliar al que se asignará el turno (debe tener rol AUXILIAR)',
  })
  @IsInt({ message: 'El ID de usuario debe ser un número entero' })
  @IsPositive({ message: 'El ID de usuario debe ser un número positivo' })
  @IsNotEmpty({ message: 'El ID de usuario es obligatorio' })
  id_usuario: number;

  @ApiProperty({
    example: 1,
    description: 'ID de la franja horaria operativa a asignar',
  })
  @IsInt({ message: 'El ID de horario debe ser un número entero' })
  @IsPositive({ message: 'El ID de horario debe ser un número positivo' })
  @IsNotEmpty({ message: 'El ID de horario es obligatorio' })
  id_horario: number;

  @ApiProperty({
    example: '1-2026',
    description: 'Semestre académico de la asignación (ej: 1-2026 o 2-2026)',
  })
  @IsString({ message: 'El semestre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El semestre académico es obligatorio' })
  @MaxLength(20, { message: 'El semestre no puede exceder los 20 caracteres' })
  semestre: string;

  @ApiProperty({
    example: '2026-02-01',
    description: 'Fecha de inicio del periodo semestral (formato YYYY-MM-DD)',
  })
  @IsDateString(
    {},
    { message: 'La fecha de inicio debe tener formato YYYY-MM-DD válido' },
  )
  @IsNotEmpty({ message: 'La fecha de inicio es obligatoria' })
  fecha_inicio: string;

  @ApiProperty({
    example: '2026-07-31',
    description:
      'Fecha de finalización del periodo semestral (formato YYYY-MM-DD)',
  })
  @IsDateString(
    {},
    { message: 'La fecha de fin debe tener formato YYYY-MM-DD válido' },
  )
  @IsNotEmpty({ message: 'La fecha de fin es obligatoria' })
  fecha_fin: string;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Estado activo de la asignación',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'El campo activo debe ser booleano' })
  activo?: boolean;
}
