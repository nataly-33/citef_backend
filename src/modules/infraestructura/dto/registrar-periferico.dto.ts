import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsInt,
  IsOptional,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RegistrarPerifericoDto {
  @Type(() => Number)
  @IsInt({ message: 'El tipo de periférico es obligatorio' })
  id_tipo_periferico: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El ID de la computadora debe ser un entero' })
  id_computadora?: number | null;

  @IsNotEmpty({ message: 'La marca y modelo son obligatorios' })
  @IsString({ message: 'La marca y modelo deben ser texto' })
  @MaxLength(80, {
    message: 'La marca y modelo no pueden superar 80 caracteres',
  })
  marca_modelo: string;

  @IsNotEmpty({ message: 'El número de activo es obligatorio' })
  @IsString({ message: 'El número de activo debe ser texto' })
  @MaxLength(60, {
    message: 'El número de activo no puede superar 60 caracteres',
  })
  numero_activo: string;

  @IsOptional()
  @IsIn(['BUENO', 'REGULAR', 'DANADO', 'FALTANTE'], {
    message: 'La condición física debe ser BUENO, REGULAR, DANADO o FALTANTE',
  })
  condicion_fisica?: string = 'BUENO';
}
