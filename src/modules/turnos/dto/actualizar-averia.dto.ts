import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EstadoAveria } from '../entities/averia-equipo.entity';

export class ActualizarAveriaDto {
  @IsEnum(EstadoAveria, {
    message:
      'estado debe ser PENDIENTE_REVISION, EN_TALLER, REPARADO o DESCARTADO',
  })
  @IsNotEmpty({ message: 'estado es obligatorio' })
  estado: EstadoAveria;

  @IsOptional()
  @IsString({ message: 'solucion_tecnica debe ser una cadena de texto' })
  solucion_tecnica?: string;
}
