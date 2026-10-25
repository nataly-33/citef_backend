import { IsOptional, IsNumber, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoMantenimiento } from '../entities/mantenimiento-taller.entity';

export class FiltroMantenimientoDto {
  @ApiPropertyOptional({
    description: 'Filtrar órdenes por ID de sala física del laboratorio',
    example: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({}, { message: 'id_sala debe ser numérico' })
  id_sala?: number;

  @ApiPropertyOptional({
    description: 'Filtrar órdenes por ID de computadora específica',
    example: 5,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({}, { message: 'id_computadora debe ser numérico' })
  id_computadora?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por estado del flujo en taller',
    enum: EstadoMantenimiento,
  })
  @IsOptional()
  @IsEnum(EstadoMantenimiento, {
    message:
      'estado debe ser PENDIENTE_TALLER, EN_REPARACION, REPARADO_EN_TALLER, RETORNADO_A_SALA o BAJA_DEFINITIVA',
  })
  estado?: EstadoMantenimiento;

  @ApiPropertyOptional({
    description:
      'Término de búsqueda textual por código de equipo, diagnóstico, problema o solución',
    example: 'PC-01',
  })
  @IsOptional()
  @IsString({ message: 'El término de búsqueda debe ser texto' })
  busqueda?: string;

  @ApiPropertyOptional({
    description: 'Número de página (parámetro en español)',
    example: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({}, { message: 'pagina debe ser un número entero' })
  pagina?: number = 1;

  @ApiPropertyOptional({
    description: 'Número de página (parámetro en inglés)',
    example: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({}, { message: 'page debe ser un número entero' })
  page?: number;

  @ApiPropertyOptional({
    description: 'Límite de elementos por página (parámetro en español)',
    example: 15,
    default: 15,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({}, { message: 'limite debe ser un número entero' })
  limite?: number = 15;

  @ApiPropertyOptional({
    description: 'Límite de elementos por página (parámetro en inglés)',
    example: 15,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({}, { message: 'limit debe ser un número entero' })
  limit?: number;
}
