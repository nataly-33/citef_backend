import {
  IsInt,
  IsString,
  IsNotEmpty,
  Min,
  Matches,
  MaxLength,
  IsOptional,
  IsEnum,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoReserva } from '../entities/reserva-sala.entity';

export class SolicitarReservaDto {
  @ApiProperty({ description: 'ID de la sala o laboratorio a reservar', example: 1 })
  @IsInt({ message: 'El ID de la sala debe ser un número entero' })
  @Min(1, { message: 'El ID de la sala no es válido' })
  id_sala: number;

  @ApiProperty({ description: 'Código institucional del docente solicitante', example: 'DOC-1001' })
  @IsString({ message: 'El código del docente debe ser texto' })
  @IsNotEmpty({ message: 'El código del docente es obligatorio' })
  codigo_docente: string;

  @ApiProperty({ description: 'ID de la materia curricular asociada', example: 1 })
  @IsInt({ message: 'El ID de la materia debe ser un número entero' })
  @Min(1, { message: 'El ID de la materia no es válido' })
  id_materia: number;

  @ApiProperty({ description: 'Fecha de la reserva (YYYY-MM-DD)', example: '2026-10-25' })
  @IsString({ message: 'La fecha de reserva debe tener formato válido' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha de reserva debe tener el formato YYYY-MM-DD',
  })
  fecha_reserva: string;

  @ApiProperty({ description: 'Hora de inicio de la clase (HH:mm)', example: '08:00' })
  @IsString({ message: 'La hora de inicio debe ser texto' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, {
    message: 'La hora de inicio debe tener formato válido HH:mm o HH:mm:ss',
  })
  hora_inicio: string;

  @ApiProperty({ description: 'Hora de culminación de la clase (HH:mm)', example: '10:00' })
  @IsString({ message: 'La hora de fin debe ser texto' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, {
    message: 'La hora de fin debe tener formato válido HH:mm o HH:mm:ss',
  })
  hora_fin: string;

  @ApiProperty({ description: 'Tema o justificación de la práctica curricular', example: 'Taller de Modelado Financiero' })
  @IsString({ message: 'El tema de la práctica debe ser texto' })
  @IsNotEmpty({ message: 'El tema de la práctica es obligatorio' })
  @MaxLength(150, { message: 'El tema no puede exceder los 150 caracteres' })
  tema_practica: string;

  @ApiProperty({ description: 'Cantidad estimada de estudiantes', example: 25 })
  @IsInt({ message: 'La cantidad estimada debe ser un número entero' })
  @Min(1, { message: 'La cantidad estimada debe ser al menos 1 estudiante' })
  cant_estimada_alumnos: number;

  @ApiPropertyOptional({ description: 'Tipo de reserva académica', enum: TipoReserva, default: TipoReserva.CLASE })
  @IsOptional()
  @IsEnum(TipoReserva, { message: 'El tipo de reserva debe ser CLASE o EXAMEN' })
  tipo_reserva?: TipoReserva;

  @ApiPropertyOptional({ description: 'Fecha límite fin para programación semestral recurrente (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  fecha_fin_semestre?: string;

  @ApiPropertyOptional({ description: 'Días de la semana para repetición (0=dom, 1=lun, ..., 6=sab)' })
  @IsOptional()
  @IsArray()
  dias_semana?: number[];
}
