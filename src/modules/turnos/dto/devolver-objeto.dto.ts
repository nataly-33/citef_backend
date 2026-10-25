import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class DevolverObjetoDto {
  @IsString({
    message: 'registro_estudiante_receptor debe ser una cadena de texto',
  })
  @IsNotEmpty({ message: 'registro_estudiante_receptor es obligatorio' })
  registro_estudiante_receptor: string;

  @IsOptional()
  @IsString({
    message: 'nombre_estudiante_receptor debe ser una cadena de texto',
  })
  nombre_estudiante_receptor?: string;

  @IsOptional()
  @IsString({ message: 'obs_devolucion debe ser texto' })
  obs_devolucion?: string;
}
