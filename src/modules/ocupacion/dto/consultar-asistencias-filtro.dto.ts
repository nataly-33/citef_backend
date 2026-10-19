import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ConsultarAsistenciasFiltroDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  id_sala?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  id_carrera?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  id_motivo?: number;

  @IsOptional()
  @IsString()
  fecha_inicio?: string;

  @IsOptional()
  @IsString()
  fecha_fin?: string;

  @IsOptional()
  @IsString()
  termino?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 15;
}
