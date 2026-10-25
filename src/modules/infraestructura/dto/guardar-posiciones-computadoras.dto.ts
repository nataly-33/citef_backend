import { IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PosicionItemDto {
  @Type(() => Number)
  @IsInt({ message: 'id_computadora debe ser un entero' })
  id_computadora: number;

  @Type(() => Number)
  @IsInt({ message: 'posicion_fila debe ser un entero' })
  @Min(1, { message: 'posicion_fila debe ser mayor o igual a 1' })
  posicion_fila: number;

  @Type(() => Number)
  @IsInt({ message: 'posicion_columna debe ser un entero' })
  @Min(1, { message: 'posicion_columna debe ser mayor o igual a 1' })
  posicion_columna: number;
}

export class GuardarPosicionesComputadorasDto {
  @IsArray({ message: 'posiciones debe ser un arreglo' })
  @ValidateNested({ each: true })
  @Type(() => PosicionItemDto)
  posiciones: PosicionItemDto[];
}
