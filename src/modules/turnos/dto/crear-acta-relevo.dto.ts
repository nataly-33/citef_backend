import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CrearActaRelevoDto {
  @Type(() => Number)
  @IsNumber({}, { message: 'id_usuario_entrante debe ser un número válido' })
  @IsNotEmpty({ message: 'id_usuario_entrante es obligatorio' })
  id_usuario_entrante: number;

  @IsOptional()
  @IsString({ message: 'novedades debe ser una cadena de texto' })
  novedades?: string;
}
