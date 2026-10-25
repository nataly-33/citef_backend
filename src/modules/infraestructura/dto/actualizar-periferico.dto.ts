import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsInt,
  IsOptional,
  IsIn,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ActualizarPerifericoDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El tipo de periférico debe ser un entero' })
  id_tipo_periferico?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El ID de la computadora debe ser un entero' })
  id_computadora?: number | null;

  @IsOptional()
  @IsString({ message: 'La marca y modelo deben ser texto' })
  @MaxLength(80, {
    message: 'La marca y modelo no pueden superar 80 caracteres',
  })
  marca_modelo?: string;

  @IsOptional()
  @IsNotEmpty({ message: 'El número de activo es obligatorio' })
  @IsString({ message: 'El número de activo debe ser texto' })
  @MaxLength(60, {
    message: 'El número de activo no puede superar 60 caracteres',
  })
  numero_activo?: string;

  @IsOptional()
  @IsIn(['BUENO', 'REGULAR', 'DANADO', 'FALTANTE'], {
    message: 'La condición física debe ser BUENO, REGULAR, DANADO o FALTANTE',
  })
  condicion_fisica?: string;

  @IsOptional()
  @IsBoolean({ message: 'activo debe ser booleano' })
  activo?: boolean;
}
