import { IsOptional, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class FiltroAveriasDto {
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  id_sala?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  id_computadora?: number;

  @IsOptional()
  @IsString()
  gravedad?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsString()
  fecha?: string;

  @IsOptional()
  @IsString()
  busqueda?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  pagina?: number = 1;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  page?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  limite?: number = 15;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  limit?: number;
}
