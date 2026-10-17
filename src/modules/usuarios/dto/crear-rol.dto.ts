import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray, IsOptional } from 'class-validator';

export class CrearRolDto {
  @ApiProperty({
    example: 'SUPERVISOR',
    description: 'Nombre único del rol en mayúsculas',
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del rol es requerido' })
  nombre: string;

  @ApiProperty({
    example: 'Supervisor de turno para inspección de salas',
    description: 'Descripción de las responsabilidades del rol',
  })
  @IsString()
  @IsNotEmpty({ message: 'La descripción del rol es requerida' })
  descrip: string;

  @ApiProperty({
    example: [1, 2, 5],
    description: 'Lista de IDs de permisos asignados al rol',
  })
  @IsArray()
  @IsOptional()
  permisos_ids?: number[];
}
