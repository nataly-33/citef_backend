import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MaxLength,
  IsEmail,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class ActualizarDocenteDto {
  @ApiPropertyOptional({
    example: 'Carlos Alberto',
    description: 'Nombres del docente',
  })
  @IsOptional()
  @IsString({ message: 'Los nombres deben ser una cadena de texto' })
  @MaxLength(100, { message: 'Los nombres no pueden exceder los 100 caracteres' })
  nombres?: string;

  @ApiPropertyOptional({
    example: 'Martinez Soliz',
    description: 'Apellidos del docente',
  })
  @IsOptional()
  @IsString({ message: 'Los apellidos deben ser una cadena de texto' })
  @MaxLength(100, { message: 'Los apellidos no pueden exceder los 100 caracteres' })
  apellidos?: string;

  @ApiPropertyOptional({
    example: 'carlos.martinez@uagrm.edu.bo',
    description: 'Correo electrónico del docente',
  })
  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico debe tener un formato válido' })
  @MaxLength(150, { message: 'El correo no puede exceder los 150 caracteres' })
  correo?: string;

  @ApiPropertyOptional({
    example: '77012345',
    description: 'Teléfono o celular de contacto del docente',
  })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @MaxLength(20, { message: 'El teléfono no puede exceder los 20 caracteres' })
  telefono?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Estado activo/inactivo del docente',
  })
  @IsOptional()
  @IsBoolean({ message: 'El campo activo debe ser booleano' })
  activo?: boolean;
}
