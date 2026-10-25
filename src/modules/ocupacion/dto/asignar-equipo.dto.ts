import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AsignarEquipoDto {
  @Type(() => Number)
  @IsNumber({}, { message: 'El id de la sala debe ser un número válido' })
  @IsNotEmpty({ message: 'El id de la sala es obligatorio' })
  id_sala: number;

  @Type(() => Number)
  @IsNumber(
    {},
    { message: 'El id de la computadora debe ser un número válido' },
  )
  @IsOptional()
  id_computadora?: number;

  @IsString()
  @IsNotEmpty({
    message: 'El registro universitario del estudiante es obligatorio',
  })
  registro_estudiante: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'El motivo de uso debe ser un número válido' })
  @IsNotEmpty({ message: 'El motivo de uso es obligatorio' })
  id_motivo: number;

  @IsBoolean()
  @IsOptional()
  asignacion_automatica?: boolean;

  @IsString()
  @IsOptional()
  observaciones?: string;
}
