import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'admin@uagrm.edu.bo',
    description: 'Correo institucional UAGRM del usuario',
  })
  @IsEmail({}, { message: 'El formato de correo institucional no es válido' })
  @IsNotEmpty({ message: 'El correo institucional es obligatorio' })
  correo: string;

  @ApiProperty({
    example: 'Admin123*',
    description: 'Contraseña del usuario',
  })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;
}
