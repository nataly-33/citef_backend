import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  TipoMantenimiento,
  PrioridadMantenimiento,
} from '../entities/mantenimiento-taller.entity';

export class CrearOrdenTallerDto {
  @ApiProperty({
    description: 'ID de la computadora que ingresa a taller',
    example: 1,
  })
  @IsNotEmpty({ message: 'El ID de la computadora es obligatorio' })
  @Type(() => Number)
  @IsNumber({}, { message: 'El ID de la computadora debe ser numérico' })
  id_computadora: number;

  @ApiPropertyOptional({
    description: 'ID de la avería técnica originaria (si aplica)',
    example: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'El ID de avería debe ser numérico' })
  id_averia?: number;

  @ApiPropertyOptional({
    description: 'ID del técnico asignado para la reparación',
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'El ID del técnico debe ser numérico' })
  id_usuario_tecnico?: number;

  @ApiPropertyOptional({
    description: 'Tipo de mantenimiento',
    enum: TipoMantenimiento,
    default: TipoMantenimiento.CORRECTIVO,
  })
  @IsOptional()
  @IsEnum(TipoMantenimiento, {
    message: 'El tipo debe ser CORRECTIVO o PREVENTIVO',
  })
  tipo_mantenimiento?: TipoMantenimiento = TipoMantenimiento.CORRECTIVO;

  @ApiPropertyOptional({
    description: 'Nivel de prioridad de atención técnica',
    enum: PrioridadMantenimiento,
    default: PrioridadMantenimiento.MEDIA,
  })
  @IsOptional()
  @IsEnum(PrioridadMantenimiento, {
    message: 'La prioridad debe ser BAJA, MEDIA, ALTA o CRITICA',
  })
  prioridad?: PrioridadMantenimiento = PrioridadMantenimiento.MEDIA;

  @ApiPropertyOptional({
    description: 'Descripción inicial del síntoma o problema detectado',
    example: 'Pantalla azul recurrente tras 10 minutos de uso',
  })
  @IsOptional()
  @IsString({ message: 'La descripción del problema debe ser texto' })
  descripcion_problema?: string;

  @ApiPropertyOptional({
    description: 'Diagnóstico preliminar o técnico inicial',
    example: 'Posible fallo en memoria RAM módulo 2',
  })
  @IsOptional()
  @IsString({ message: 'El diagnóstico técnico debe ser texto' })
  diagnostico_tecnico?: string;
}
