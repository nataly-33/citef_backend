import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Token criptográfico de 64 caracteres recibido por correo institucional',
    example: 'a8f5f167f44f4964e6c998dee827110c...',
  })
  @IsString()
  @IsNotEmpty({ message: 'El token de recuperación es requerido' })
  token: string;

  @ApiProperty({
    description: 'Nueva contraseña segura',
    example: 'NuevaPassword2026*',
  })
  @IsString()
  @IsNotEmpty({ message: 'La nueva contraseña no puede estar vacía' })
  @MinLength(6, { message: 'La nueva contraseña debe tener al menos 6 caracteres' })
  nueva_password: string;
}
