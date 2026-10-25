import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CategoriaObjeto } from '../entities/objeto-extraviado.entity';

export class RegistrarObjetoDto {
  @Type(() => Number)
  @IsNumber({}, { message: 'id_sala debe ser un número válido' })
  @IsNotEmpty({ message: 'id_sala es obligatorio' })
  id_sala: number;

  @IsEnum(CategoriaObjeto, {
    message:
      'categoria debe ser ELECTRONICA, DOCUMENTO, PRENDA, MATERIAL_ESTUDIO u OTRO',
  })
  @IsNotEmpty({ message: 'categoria es obligatoria' })
  categoria: CategoriaObjeto;

  @IsString({ message: 'descrip_detallada debe ser texto' })
  @IsNotEmpty({ message: 'descrip_detallada es obligatoria' })
  descrip_detallada: string;

  @IsString({ message: 'lugar_exacto debe ser texto' })
  @IsNotEmpty({ message: 'lugar_exacto es obligatorio' })
  lugar_exacto: string;

  @IsOptional()
  fecha_hora_hallazgo?: Date | string;
}
