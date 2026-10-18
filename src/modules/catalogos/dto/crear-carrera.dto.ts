import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, IsOptional, IsBoolean } from 'class-validator';

export class CrearCarreraDto {
  @ApiProperty({
    example: '186-5',
    description: 'Código oficial de la carrera en la FCEE - UAGRM',
  })
  @IsString({ message: 'El código debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El código de la carrera es obligatorio' })
  @MaxLength(20, { message: 'El código no puede exceder los 20 caracteres' })
  codigo: string;

  @ApiProperty({
    example: 'Ingeniería Comercial',
    description: 'Nombre descriptivo de la carrera profesional',
  })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre de la carrera es obligatorio' })
  @MaxLength(100, { message: 'El nombre no puede exceder los 100 caracteres' })
  nombre: string;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Estado activo/inactivo de la carrera',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'El campo activo debe ser booleano' })
  activo?: boolean;
}
