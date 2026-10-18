import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MaxLength,
  Matches,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class ActualizarHorarioDto {
  @ApiPropertyOptional({
    example: 'MAÑANA',
    description: 'Turno operativo: MAÑANA, TARDE, NOCHE',
  })
  @IsOptional()
  @IsString({ message: 'El turno debe ser una cadena de texto' })
  @MaxLength(20, { message: 'El turno no puede exceder los 20 caracteres' })
  turno?: string;

  @ApiPropertyOptional({
    example: '07:00:00',
    description: 'Hora de inicio de la franja horaria (formato HH:mm:ss o HH:mm)',
  })
  @IsOptional()
  @IsString({ message: 'La hora de inicio debe ser una cadena de texto' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'La hora de inicio debe tener el formato HH:mm o HH:mm:ss',
  })
  hora_inicio?: string;

  @ApiPropertyOptional({
    example: '12:00:00',
    description: 'Hora de finalización de la franja horaria (formato HH:mm:ss o HH:mm)',
  })
  @IsOptional()
  @IsString({ message: 'La hora de fin debe ser una cadena de texto' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'La hora de fin debe tener el formato HH:mm o HH:mm:ss',
  })
  hora_fin?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Estado activo/inactivo del horario',
  })
  @IsOptional()
  @IsBoolean({ message: 'El campo activo debe ser booleano' })
  activo?: boolean;
}
