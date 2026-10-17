import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsArray,
  IsOptional,
  Matches,
} from 'class-validator';

export class CrearUsuarioDto {
  @ApiProperty({
    example: 'j.perez@uagrm.edu.bo',
    description: 'Correo institucional UAGRM (debe terminar en @uagrm.edu.bo)',
  })
  @IsEmail({}, { message: 'El correo debe tener un formato válido' })
  @Matches(/^[a-zA-Z0-9._%+-]+@uagrm\.edu\.bo$/, {
    message: 'El correo institucional debe pertenecer al dominio @uagrm.edu.bo',
  })
  @IsNotEmpty({ message: 'El correo institucional es requerido' })
  correo_institucional: string;

  @ApiProperty({
    example: 'Perez2026*',
    description: 'Contraseña inicial del usuario (mínimo 6 caracteres)',
  })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  password: string;

  @ApiProperty({ example: 'Juan Carlos', description: 'Nombres del usuario' })
  @IsString()
  @IsNotEmpty({ message: 'Los nombres son requeridos' })
  nombres: string;

  @ApiProperty({ example: 'Perez Mercado', description: 'Apellidos del usuario' })
  @IsString()
  @IsNotEmpty({ message: 'Los apellidos son requeridos' })
  apellidos: string;

  @ApiProperty({
    example: '70012345',
    required: false,
    description: 'Teléfono celular de contacto',
  })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiProperty({
    example: [1, 3],
    description: 'Lista de IDs de roles a asignar (ej: 1=ADMINISTRADOR, 2=DOCENTE, 3=AUXILIAR, 4=TECNICO)',
  })
  @IsArray({ message: 'Los roles deben ser un arreglo de identificadores' })
  @IsNotEmpty({ message: 'Debe asignar al menos un rol al usuario' })
  roles_ids: number[];
}
