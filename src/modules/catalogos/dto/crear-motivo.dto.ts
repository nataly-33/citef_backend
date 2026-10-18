import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsIn,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CrearMotivoDto {
  @ApiProperty({
    example: 'Clase Práctica',
    description: 'Descripción del motivo de uso del laboratorio',
  })
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La descripción del motivo es obligatoria' })
  @MaxLength(100, { message: 'La descripción no puede exceder los 100 caracteres' })
  descrip: string;

  @ApiProperty({
    example: 'ACADEMICO',
    description: 'Tipo de motivo operativo: ACADEMICO, LIBRE, ADMINISTRATIVO',
    enum: ['ACADEMICO', 'LIBRE', 'ADMINISTRATIVO'],
  })
  @IsString({ message: 'El tipo debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El tipo de motivo es obligatorio' })
  @IsIn(['ACADEMICO', 'LIBRE', 'ADMINISTRATIVO'], {
    message: 'El tipo debe ser ACADEMICO, LIBRE o ADMINISTRATIVO',
  })
  tipo: string;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Estado activo/inactivo del motivo',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'El campo activo debe ser booleano' })
  activo?: boolean;
}
