import { IsEnum, IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
    description: 'Dictamen formal, motivo de rechazo o notas técnicas de Jefatura',
    example: 'Aprobado con habilitación de software SPSS en puestos 1 al 20',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El dictamen u observación debe ser texto' })
  @MaxLength(255, { message: 'El dictamen no puede superar los 255 caracteres' })
  obs_resolucion?: string;
}
