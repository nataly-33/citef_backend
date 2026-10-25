import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ChecklistAperturaDto {
  @IsBoolean({ message: 'El estado de luces debe ser booleano' })
  luces: boolean;

  @IsOptional()
  @IsBoolean({ message: 'El estado de orden debe ser booleano' })
  orden?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'El estado de orden y limpieza debe ser booleano' })
  orden_limpieza?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'El estado del aire acondicionado debe ser booleano' })
  aire?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'El estado del aire acondicionado debe ser booleano' })
  aire_acondicionado?: boolean;

  @IsBoolean({ message: 'El estado del proyector debe ser booleano' })
  proyector: boolean;

  @IsOptional()
  pcs_encendidas?: any;

  @IsOptional()
  @IsString({ message: 'La observación debe ser una cadena de texto' })
  observacion?: string;

  @IsOptional()
  @IsString({ message: 'La observación debe ser una cadena de texto' })
  observaciones?: string;
}

export class AbrirTurnoDto {
  @Type(() => Number)
  @IsNumber({}, { message: 'id_sala debe ser un número válido' })
  @IsNotEmpty({ message: 'id_sala es obligatorio' })
  id_sala: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber({}, { message: 'id_asignar_turno debe ser un número válido' })
  id_asignar_turno?: number;

  @ValidateNested()
  @Type(() => ChecklistAperturaDto)
  @IsNotEmpty({ message: 'checklist_apertura es obligatorio' })
  checklist_apertura: ChecklistAperturaDto;
}
