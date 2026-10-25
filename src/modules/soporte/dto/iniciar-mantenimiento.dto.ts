import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IniciarMantenimientoDto {
  @ApiProperty({
    description: 'Diagnóstico técnico detallado y causa raíz de la falla',
    example:
      'Sobrecalentamiento del procesador por falla en ventilador del disipador térmico.',
  })
  @IsNotEmpty({
    message: 'El diagnóstico técnico es obligatorio para iniciar reparación',
  })
  @IsString({ message: 'El diagnóstico técnico debe ser una cadena de texto' })
  diagnostico_tecnico: string;

  @ApiPropertyOptional({
    description: 'ID del técnico que asume la reparación en banco de trabajo',
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'El ID de técnico debe ser numérico' })
  id_usuario_tecnico?: number;

  @ApiPropertyOptional({
    description:
      'Fecha y hora de inicio de intervención en taller (ISO string)',
    example: '2026-10-25T14:30:00.000Z',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha de inicio debe tener formato ISO válido' },
  )
  fecha_hora_inicio?: string;
}
