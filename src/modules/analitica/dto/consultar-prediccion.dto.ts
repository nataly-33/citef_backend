import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class ConsultarPrediccionDto {
  @ApiProperty({
    description: 'ID de la sala o laboratorio a evaluar',
    example: 1,
  })
  @IsNotEmpty({ message: 'El ID de la sala es obligatorio' })
  @Type(() => Number)
  @IsInt({ message: 'El ID de sala debe ser un número entero' })
  id_sala: number;

  @ApiPropertyOptional({
    description: 'Fecha objetivo para proyectar la demanda (YYYY-MM-DD)',
    example: '2026-04-15',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha objetivo debe tener formato YYYY-MM-DD válido' },
  )
  fecha?: string;

  @ApiPropertyOptional({
    description: 'Capacidad instalada física de computadoras en la sala',
    example: 24,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La capacidad debe ser un número entero' })
  @Min(1, { message: 'La capacidad mínima debe ser 1' })
  capacidad_sala?: number;

  @ApiPropertyOptional({
    description:
      'Indica si la fecha proyectada coincide con semana de exámenes parciales/finales',
    example: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'es_semana_examenes debe ser un booleano' })
  es_semana_examenes?: boolean;

  @ApiPropertyOptional({
    description: 'Hora de inicio de la franja a predecir (0-23)',
    example: 7,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(23)
  hora_inicio?: number;

  @ApiPropertyOptional({
    description: 'Hora de fin de la franja a predecir (1-24)',
    example: 22,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  hora_fin?: number;
}
