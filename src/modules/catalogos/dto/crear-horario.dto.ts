import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  Matches,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CrearHorarioDto {
  @ApiProperty({
    example: 'MAÑANA',
    description: 'Turno operativo: MAÑANA, TARDE, NOCHE',
  })
  @IsString({ message: 'El turno debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El turno es obligatorio' })
  @MaxLength(20, { message: 'El turno no puede exceder los 20 caracteres' })
  turno: string;

  @ApiProperty({
    example: '07:00:00',
    description: 'Hora de inicio de la franja horaria (formato HH:mm:ss o HH:mm)',
  })
  @IsString({ message: 'La hora de inicio debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La hora de inicio es obligatoria' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'La hora de inicio debe tener el formato HH:mm o HH:mm:ss',
  })
  hora_inicio: string;

  @ApiProperty({
    example: '12:00:00',
    description: 'Hora de finalización de la franja horaria (formato HH:mm:ss o HH:mm)',
  })
  @IsString({ message: 'La hora de fin debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La hora de fin es obligatoria' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'La hora de fin debe tener el formato HH:mm o HH:mm:ss',
  })
  hora_fin: string;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Estado activo/inactivo del horario',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'El campo activo debe ser booleano' })
  activo?: boolean;
}
