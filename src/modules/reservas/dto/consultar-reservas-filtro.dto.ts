import { IsOptional, IsInt, IsString, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoReserva } from '../entities/reserva-sala.entity';

export class ConsultarReservasFiltroDto {
  @ApiPropertyOptional({ description: 'Filtrar por ID de sala' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_sala?: number;

  @ApiPropertyOptional({ description: 'Filtrar desde la fecha (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  fecha_desde?: string;

  @ApiPropertyOptional({ description: 'Filtrar hasta la fecha (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  fecha_hasta?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por estado',
    enum: EstadoReserva,
  })
  @IsOptional()
  @IsEnum(EstadoReserva)
  estado?: EstadoReserva;

  @ApiPropertyOptional({ description: 'Filtrar por código de docente' })
  @IsOptional()
  @IsString()
  codigo_docente?: string;

  @ApiPropertyOptional({
    description: 'Búsqueda por texto (materia, docente, tema, sala)',
  })
  @IsOptional()
  @IsString()
  busqueda?: string;

  @ApiPropertyOptional({
    description: 'Número de página (1-based)',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number = 1;

  @ApiPropertyOptional({
    description: 'Límite de registros por página',
    default: 15,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limite?: number = 15;
}
