import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class FirmarActaRelevoDto {
  @IsOptional()
  @IsBoolean({ message: 'aceptado debe ser booleano' })
  aceptado?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'conforme debe ser booleano' })
  conforme?: boolean;

  @IsOptional()
  @IsString({ message: 'obs_discrepancia debe ser una cadena de texto' })
  obs_discrepancia?: string;
}
