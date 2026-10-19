import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class EncolarEstudianteDto {
  @IsNumber()
  @IsNotEmpty({ message: 'El id de la sala es obligatorio' })
  id_sala: number;

  @IsString()
  @IsNotEmpty({ message: 'El registro universitario del estudiante es obligatorio' })
  registro_estudiante: string;
}
