import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MaxLength,
  IsIn,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class ActualizarMotivoDto {
  @ApiPropertyOptional({
    example: 'Clase Práctica',
    description: 'Descripción del motivo de uso del laboratorio',
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @MaxLength(100, { message: 'La descripción no puede exceder los 100 caracteres' })
  descrip?: string;

  @ApiPropertyOptional({
    example: 'ACADEMICO',
    description: 'Tipo de motivo operativo: ACADEMICO, LIBRE, ADMINISTRATIVO',
    enum: ['ACADEMICO', 'LIBRE', 'ADMINISTRATIVO'],
  })
  @IsOptional()
  @IsString({ message: 'El tipo debe ser una cadena de texto' })
  @IsIn(['ACADEMICO', 'LIBRE', 'ADMINISTRATIVO'], {
    message: 'El tipo debe ser ACADEMICO, LIBRE o ADMINISTRATIVO',
  })
  tipo?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Estado activo/inactivo del motivo',
  })
  @IsOptional()
  @IsBoolean({ message: 'El campo activo debe ser booleano' })
  activo?: boolean;
}
