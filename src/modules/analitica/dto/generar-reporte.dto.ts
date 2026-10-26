import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class GenerarReporteDto {
  @ApiProperty({
    description: 'Código del reporte oficial a generar',
    enum: [
      'REP_CATEDRAS',
      'REP_OCUPACION',
      'REP_RAMS',
      'REP_EVALUACIONES',
      'REP_AUDITORIA',
    ],
    example: 'REP_CATEDRAS',
  })
  @IsNotEmpty({ message: 'El código de reporte es obligatorio' })
  @IsString()
  @IsIn(
    [
      'REP_CATEDRAS',
      'REP_OCUPACION',
      'REP_RAMS',
      'REP_EVALUACIONES',
      'REP_AUDITORIA',
    ],
    {
      message:
        'El código de reporte debe ser uno de: REP_CATEDRAS, REP_OCUPACION, REP_RAMS, REP_EVALUACIONES, REP_AUDITORIA',
    },
  )
  codigo_reporte: string;

  @ApiProperty({
    description: 'Formato de salida del documento oficial',
    enum: ['EXCEL', 'PDF'],
    example: 'EXCEL',
  })
  @IsNotEmpty({ message: 'El formato de reporte es obligatorio' })
  @IsString()
  @IsIn(['EXCEL', 'PDF'], {
    message: 'El formato debe ser EXCEL o PDF',
  })
  formato: string;

  @ApiPropertyOptional({
    description: 'ID de sala opcional para acotar el reporte',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El ID de sala debe ser un número entero' })
  id_sala?: number;

  @ApiPropertyOptional({
    description: 'Fecha de inicio del rango (YYYY-MM-DD)',
    example: '2026-03-01',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha de inicio debe tener formato YYYY-MM-DD válido' },
  )
  fecha_inicio?: string;

  @ApiPropertyOptional({
    description: 'Fecha de fin del rango (YYYY-MM-DD)',
    example: '2026-03-31',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha de fin debe tener formato YYYY-MM-DD válido' },
  )
  fecha_fin?: string;
}
