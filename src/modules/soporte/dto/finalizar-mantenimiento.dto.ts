import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FinalizarMantenimientoDto {
  @ApiProperty({
    description: 'Solución técnica aplicada y tareas ejecutadas en el equipo',
    example:
      'Limpieza exhaustiva del disipador, aplicación de nueva pasta térmica Artic MX-4 y prueba de estrés térmico satisfactoria durante 45 minutos.',
  })
  @IsNotEmpty({ message: 'La solución técnica aplicada es obligatoria' })
  @IsString({ message: 'La solución técnica debe ser texto' })
  solucion_aplicada: string;

  @ApiPropertyOptional({
    description: 'Piezas, componentes o cables sustituidos del inventario',
    example: 'Ventilador Cooler Master 120mm, pasta térmica',
  })
  @IsOptional()
  @IsString({ message: 'Los repuestos utilizados deben ser texto' })
  repuestos_utilizados?: string;

  @ApiPropertyOptional({
    description:
      'Duración neta de la reparación en taller en horas (insumo directo para cálculo de MTTR). Si se omite, se calcula automáticamente.',
    example: 2.5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'La duración en horas debe ser un número decimal' })
  duracion_taller_horas?: number;

  @ApiPropertyOptional({
    description: 'Costo total estimado o liquidado de reparación en Bs.',
    example: 150.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'El costo de reparación debe ser un número' })
  costo_reparacion?: number;

  @ApiPropertyOptional({
    description:
      'Fecha y hora de finalización de trabajos técnicos (ISO string)',
    example: '2026-10-25T17:00:00.000Z',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha de fin debe tener formato ISO válido' },
  )
  fecha_hora_fin?: string;
}
