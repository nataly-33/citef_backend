import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsEmail,
  ValidateIf,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class RegistrarEstudianteDto {
  @IsString()
  @IsNotEmpty({ message: 'El registro universitario es obligatorio' })
  registro: string;

  @IsString()
  @IsNotEmpty({ message: 'La cédula de identidad es obligatoria' })
  ci: string;

  @IsString()
  @IsNotEmpty({ message: 'Los nombres son obligatorios' })
  nombres: string;

  @IsString()
  @IsNotEmpty({ message: 'Los apellidos son obligatorios' })
  apellidos: string;

  @ValidateIf(
    (o) =>
      o.correo !== null &&
      o.correo !== undefined &&
      typeof o.correo === 'string' &&
      o.correo.trim().length > 0,
  )
  @IsEmail({}, { message: 'El correo debe tener un formato válido' })
  @Transform(({ value }) =>
    value && typeof value === 'string' && value.trim().length > 0
      ? value.trim().toLowerCase()
      : null,
  )
  @IsOptional()
  correo?: string | null;

  @Type(() => Number)
  @IsNumber({}, { message: 'id_carrera debe ser un número válido' })
  @IsNotEmpty({ message: 'La carrera es obligatoria' })
  id_carrera: number;
}

