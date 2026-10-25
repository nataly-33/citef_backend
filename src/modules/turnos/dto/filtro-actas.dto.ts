import { IsOptional, IsNumber, IsString, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class FiltroActasDto {
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  id_sala?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  id_usuario_saliente?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  id_usuario_entrante?: number;

  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsOptional()
  @IsBoolean()
  aceptado_por_entrante?: boolean;

  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsOptional()
  @IsBoolean()
  solo_pendientes_firma?: boolean;

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
