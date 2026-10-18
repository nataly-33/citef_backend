import { IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class AsignarPerifericoDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'id_computadora debe ser un entero o nulo' })
  id_computadora?: number | null;
}
