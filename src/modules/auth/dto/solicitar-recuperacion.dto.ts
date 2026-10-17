import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class SolicitarRecuperacionDto {
  @ApiProperty({
    example: 'admin@uagrm.edu.bo',
    description: 'Correo institucional UAGRM para recibir el enlace de recuperación',
  })
  @IsEmail({}, { message: 'El correo debe tener un formato válido' })
  @IsNotEmpty({ message: 'El correo institucional es obligatorio' })
  correo: string;
}
