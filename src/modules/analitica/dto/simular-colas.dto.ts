import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class SimularColasDto {
  @ApiProperty({
    description:
      'Tasa media de llegada de estudiantes (lambda) en estudiantes/hora',
    example: 18.5,
  })
  @IsNotEmpty({ message: 'lambda_llegadas es obligatorio' })
  @Type(() => Number)
  @IsNumber({}, { message: 'lambda_llegadas debe ser un valor numérico' })
  @Min(0.01, { message: 'lambda_llegadas debe ser mayor a 0' })
  lambda_llegadas: number;

  @ApiProperty({
    description:
      'Tasa media de atención individual por servidor (mu) en estudiantes/hora',
    example: 1.2,
  })
  @IsNotEmpty({ message: 'mu_servicio es obligatorio' })
  @Type(() => Number)
  @IsNumber({}, { message: 'mu_servicio debe ser un valor numérico' })
  @Min(0.01, { message: 'mu_servicio debe ser mayor a 0' })
  mu_servicio: number;

  @ApiProperty({
    description:
      'Número de servidores en paralelo (c) = computadoras operativas asignables',
    example: 20,
  })
  @IsNotEmpty({ message: 'c_servidores es obligatorio' })
  @Type(() => Number)
  @IsInt({ message: 'c_servidores debe ser un número entero' })
  @Min(1, { message: 'Debe existir al menos 1 servidor' })
  c_servidores: number;

  @ApiPropertyOptional({
    description:
      'Tiempo de tolerancia máxima de espera en minutos (para evaluar P(Wq > t))',
    example: 15,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'tolerancia_espera_min debe ser un número' })
  @Min(0, { message: 'tolerancia_espera_min debe ser mayor o igual a 0' })
  tolerancia_espera_min?: number;
}
