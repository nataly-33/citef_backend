import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DarBajaDto {
  @ApiProperty({
    description:
      'Motivo técnico por el cual se declara la baja definitiva del equipo',
    example:
      'Tarjeta madre y procesador quemados por pico eléctrico; reparación inviable por obsolescencia de repuestos.',
  })
  @IsNotEmpty({ message: 'El motivo de baja es obligatorio' })
  @IsString({ message: 'El motivo de baja debe ser una cadena de texto' })
  motivo: string;
}
