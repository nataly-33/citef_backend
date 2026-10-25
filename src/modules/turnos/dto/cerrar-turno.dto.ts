import { IsOptional, IsString, IsObject, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CerrarTurnoDto {
  @IsOptional()
  @IsObject({ message: 'checklist_cierre debe ser un objeto válido' })
  checklist_cierre?: Record<string, any>;

  @IsOptional()
  @IsString({ message: 'obs_cierre debe ser texto' })
  obs_cierre?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'id_usuario_entrante debe ser un número válido' })
  id_usuario_entrante?: number;
}
