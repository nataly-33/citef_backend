import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsOptional,
  IsIn,
} from 'class-validator';

export class CrearSalaDto {
  @IsNotEmpty({ message: 'El código de sala es obligatorio' })
  @IsString({ message: 'El código de sala debe ser texto' })
  @MaxLength(20, { message: 'El código de sala no puede exceder 20 caracteres' })
  codigo_sala: string;

  @IsNotEmpty({ message: 'El nombre de la sala es obligatorio' })
  @IsString({ message: 'El nombre debe ser texto' })
  @MaxLength(80, { message: 'El nombre no puede exceder 80 caracteres' })
  nombre: string;

  @IsInt({ message: 'El piso debe ser un número entero' })
  @Min(0, { message: 'El piso no puede ser menor a 0' })
  @Max(20, { message: 'El piso no puede ser mayor a 20' })
  piso: number;

  @IsOptional()
  @IsInt({ message: 'La capacidad de estudiantes debe ser un número entero' })
  @Min(1, { message: 'La capacidad debe ser de al menos 1 estudiante' })
  @Max(100, { message: 'La capacidad no puede exceder 100 estudiantes' })
  cant_estudiantes?: number = 24;

  @IsOptional()
  @IsBoolean({ message: 'maquina_docente debe ser booleano' })
  maquina_docente?: boolean = true;

  @IsOptional()
  @IsBoolean({ message: 'proyector debe ser booleano' })
  proyector?: boolean = true;

  @IsOptional()
  @IsBoolean({ message: 'aire_acondicionado debe ser booleano' })
  aire_acondicionado?: boolean = true;

  @IsOptional()
  @IsInt({ message: 'Las filas de la cuadrícula deben ser un entero' })
  @Min(2, { message: 'Mínimo 2 filas' })
  @Max(20, { message: 'Máximo 20 filas' })
  filas_cuadricula?: number = 6;

  @IsOptional()
  @IsInt({ message: 'Las columnas de la cuadrícula deben ser un entero' })
  @Min(2, { message: 'Mínimo 2 columnas' })
  @Max(20, { message: 'Máximo 20 columnas' })
  columnas_cuadricula?: number = 8;

  @IsOptional()
  @IsIn(['OPERATIVA', 'EN_MANTENIMIENTO', 'CERRADA'], {
    message: 'El estado debe ser OPERATIVA, EN_MANTENIMIENTO o CERRADA',
  })
  estado_operativo?: string = 'OPERATIVA';
}
