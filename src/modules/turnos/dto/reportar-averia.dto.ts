import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoFalla, GravedadAveria } from '../entities/averia-equipo.entity';

export class ReportarAveriaDto {
  @Type(() => Number)
  @IsNumber({}, { message: 'id_computadora debe ser un número válido' })
  @IsNotEmpty({ message: 'id_computadora es obligatorio' })
  id_computadora: number;

  @IsString({ message: 'descrip_falla debe ser texto' })
  @IsNotEmpty({ message: 'descrip_falla es obligatoria' })
  descrip_falla: string;

  @IsEnum(TipoFalla, {
    message: 'tipo_falla debe ser HARDWARE, SOFTWARE, RED o PERIFERICO',
  })
  @IsNotEmpty({ message: 'tipo_falla es obligatorio' })
  tipo_falla: TipoFalla;

  @IsOptional()
  @IsEnum(GravedadAveria, {
    message: 'gravedad debe ser BAJA, MEDIA o CRITICA',
  })
  gravedad?: GravedadAveria;

  @IsOptional()
  @IsString({
    message: 'registro_ultimo_estudiante debe ser una cadena de texto',
  })
  registro_ultimo_estudiante?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber({}, { message: 'id_reserva debe ser un número válido' })
  id_reserva?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber({}, { message: 'id_jornada debe ser un número válido' })
  id_jornada?: number;
}
