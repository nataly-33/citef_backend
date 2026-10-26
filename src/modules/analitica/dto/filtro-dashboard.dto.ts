import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class FiltroDashboardDto {
  @ApiPropertyOptional({
    description: 'ID de la sala para filtrar métricas de un laboratorio específico',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El ID de sala debe ser un número entero' })
  id_sala?: number;

  @ApiPropertyOptional({
    description: 'Fecha de inicio del rango de análisis (YYYY-MM-DD)',
    example: '2026-03-01',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha de inicio debe tener formato YYYY-MM-DD válido' },
  )
  fecha_inicio?: string;

  @ApiPropertyOptional({
    description: 'Fecha de fin del rango de análisis (YYYY-MM-DD)',
    example: '2026-03-31',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha de fin debe tener formato YYYY-MM-DD válido' },
  )
  fecha_fin?: string;

  @ApiPropertyOptional({
    description: 'Periodo de agregación (ej. "SEMESTRAL", "MENSUAL", "SEMANAL")',
    example: 'SEMESTRAL',
  })
  @IsOptional()
  @IsString({ message: 'El periodo debe ser una cadena de texto' })
  periodo?: string;
}
