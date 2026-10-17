import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class ActualizarUsuarioDto {
  @ApiProperty({ example: 'Juan Carlos', required: false })
  @IsOptional()
  @IsString()
  nombres?: string;

  @ApiProperty({ example: 'Perez Mercado', required: false })
  @IsOptional()
  @IsString()
  apellidos?: string;

  @ApiProperty({ example: '70012345', required: false })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiProperty({ example: [1, 2], required: false })
  @IsOptional()
  @IsArray()
  roles_ids?: number[];
}
