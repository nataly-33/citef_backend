import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class LiberarEquipoDto {
  @IsNumber()
  @IsNotEmpty({ message: 'El id de la computadora es obligatorio' })
  id_computadora: number;

  @IsString()
  @IsOptional()
  observaciones?: string;
}
