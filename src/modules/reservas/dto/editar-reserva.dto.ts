import {
  IsInt,
  IsString,
  Min,
  Matches,
  MaxLength,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoReserva } from '../entities/reserva-sala.entity';

export class EditarReservaDto {
  @ApiPropertyOptional({ description: 'ID de la sala o laboratorio a reasignar' })
  @IsOptional()
  @IsInt({ message: 'El ID de la sala debe ser un número entero' })
  @Min(1, { message: 'El ID de la sala no es válido' })
  id_sala?: number;

  @ApiPropertyOptional({ description: 'Fecha de la reserva (YYYY-MM-DD)' })
  @IsOptional()
  @IsString({ message: 'La fecha de reserva debe tener formato válido' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha de reserva debe tener el formato YYYY-MM-DD',
  })
  fecha_reserva?: string;

  @ApiPropertyOptional({ description: 'Hora de inicio de la clase (HH:mm)' })
  @IsOptional()
  @IsString({ message: 'La hora de inicio debe ser texto' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, {
    message: 'La hora de inicio debe tener formato válido HH:mm o HH:mm:ss',
  })
  hora_inicio?: string;

  @ApiPropertyOptional({ description: 'Hora de fin de la clase (HH:mm)' })
  @IsOptional()
  @IsString({ message: 'La hora de fin debe ser texto' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, {
    message: 'La hora de fin debe tener formato válido HH:mm o HH:mm:ss',
  })
  hora_fin?: string;

  @ApiPropertyOptional({ description: 'Tema o justificación de la práctica' })
  @IsOptional()
  @IsString({ message: 'El tema de la práctica debe ser texto' })
  @MaxLength(150, { message: 'El tema no puede exceder los 150 caracteres' })
  tema_practica?: string;

  @ApiPropertyOptional({ description: 'Cantidad estimada de estudiantes' })
  @IsOptional()
  @IsInt({ message: 'La cantidad estimada debe ser un número entero' })
  @Min(1, { message: 'La cantidad estimada debe ser al menos 1 estudiante' })
  cant_estimada_alumnos?: number;

  @ApiPropertyOptional({ description: 'Tipo de reserva académica', enum: TipoReserva })
  @IsOptional()
  @IsEnum(TipoReserva, { message: 'El tipo de reserva debe ser CLASE o EXAMEN' })
  tipo_reserva?: TipoReserva;

  @ApiPropertyOptional({ description: 'Observación o justificación del cambio realizado' })
  @IsOptional()
  @IsString()
  obs_edicion?: string;
}
