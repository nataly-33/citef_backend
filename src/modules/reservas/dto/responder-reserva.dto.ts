import {
  IsEnum,
  IsString,
  IsOptional,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AccionResolucionReserva {
  APROBAR = 'APROBAR',
  RECHAZAR = 'RECHAZAR',
}

export class ResponderReservaDto {
  @ApiProperty({
    description: 'Acción formal de Jefatura',
    enum: AccionResolucionReserva,
    example: AccionResolucionReserva.APROBAR,
  })
  @IsEnum(AccionResolucionReserva, {
    message: 'La acción debe ser APROBAR o RECHAZAR',
  })
  accion: AccionResolucionReserva;

  @ApiProperty({
    description:
      'Dictamen formal, motivo de rechazo o notas técnicas de Jefatura',
    example: 'Aprobado con habilitación de software SPSS en puestos 1 al 20',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El dictamen u observación debe ser texto' })
  @MaxLength(255, {
    message: 'El dictamen no puede superar los 255 caracteres',
  })
  obs_resolucion?: string;

  @ApiPropertyOptional({
    description:
      'Si es true y la reserva es de tipo CLASE, aprueba en lote todas las clases recurrentes pendientes del semestre',
    example: true,
  })
  @IsOptional()
  @IsBoolean({
    message: 'aprobar_todas_recurrentes debe ser un valor booleano',
  })
  aprobar_todas_recurrentes?: boolean;
}
