import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsEmail,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CrearDocenteDto {
  @ApiProperty({
    example: 'DOC-1025',
    description: 'Código único de docente UAGRM',
  })
  @IsString({ message: 'El código debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El código del docente es obligatorio' })
  @MaxLength(30, { message: 'El código no puede exceder los 30 caracteres' })
  codigo: string;

  @ApiProperty({
    example: 'Carlos Alberto',
    description: 'Nombres del docente',
  })
  @IsString({ message: 'Los nombres deben ser una cadena de texto' })
  @IsNotEmpty({ message: 'Los nombres del docente son obligatorios' })
  @MaxLength(100, { message: 'Los nombres no pueden exceder los 100 caracteres' })
  nombres: string;

  @ApiProperty({
    example: 'Martinez Soliz',
    description: 'Apellidos del docente',
  })
  @IsString({ message: 'Los apellidos deben ser una cadena de texto' })
  @IsNotEmpty({ message: 'Los apellidos del docente son obligatorios' })
  @MaxLength(100, { message: 'Los apellidos no pueden exceder los 100 caracteres' })
  apellidos: string;

  @ApiProperty({
    example: 'carlos.martinez@uagrm.edu.bo',
    description: 'Correo electrónico institucional o personal del docente',
  })
  @IsEmail({}, { message: 'El correo electrónico debe tener un formato válido' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  @MaxLength(150, { message: 'El correo no puede exceder los 150 caracteres' })
  correo: string;

  @ApiProperty({
    example: '77012345',
    required: false,
    description: 'Teléfono o celular de contacto del docente',
  })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @MaxLength(20, { message: 'El teléfono no puede exceder los 20 caracteres' })
  telefono?: string;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Estado activo/inactivo del docente',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'El campo activo debe ser booleano' })
  activo?: boolean;
}
