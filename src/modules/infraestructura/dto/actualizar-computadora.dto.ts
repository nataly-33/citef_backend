import {
  IsString,
  MaxLength,
  IsInt,
  Min,
  IsBoolean,
  IsOptional,
  IsIn,
  IsNumber,
} from 'class-validator';

export class ActualizarComputadoraDto {
  @IsOptional()
  @IsString({ message: 'El código de equipo debe ser texto' })
  @MaxLength(30, { message: 'El código de equipo no puede superar 30 caracteres' })
  codigo_equipo?: string;

  @IsOptional()
  @IsBoolean({ message: 'maquina_docente debe ser booleano' })
  maquina_docente?: boolean;

  @IsOptional()
  @IsInt({ message: 'La fila debe ser un entero' })
  @Min(1, { message: 'La fila debe ser mayor o igual a 1' })
  posicion_fila?: number;

  @IsOptional()
  @IsInt({ message: 'La columna debe ser un entero' })
  @Min(1, { message: 'La columna debe ser mayor o igual a 1' })
  posicion_columna?: number;

  @IsOptional()
  @IsIn(['DISPONIBLE', 'OCUPADA', 'RESERVADA', 'EN_MANTENIMIENTO'], {
    message: 'El estado debe ser DISPONIBLE, OCUPADA, RESERVADA o EN_MANTENIMIENTO',
  })
  estado_actual?: string;

  @IsOptional()
  @IsString({ message: 'La IP debe ser texto' })
  @MaxLength(45, { message: 'La IP no puede superar 45 caracteres' })
  ip_red?: string;

  @IsOptional()
  @IsString({ message: 'La MAC address debe ser texto' })
  @MaxLength(20, { message: 'La MAC address no puede superar 20 caracteres' })
  mac_address?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Las horas de uso acumuladas deben ser un número' })
  @Min(0, { message: 'Las horas no pueden ser negativas' })
  horas_uso_acumuladas?: number;

  @IsOptional()
  @IsBoolean({ message: 'activo debe ser booleano' })
  activo?: boolean;
}
