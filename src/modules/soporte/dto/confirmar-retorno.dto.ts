import { IsOptional, IsBoolean, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ConfirmarRetornoDto {
  @ApiPropertyOptional({
    description:
      'Indica si las pruebas físicas, de arranque de SO y de red fueron satisfactorias',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'pruebas_satisfactorias debe ser un valor booleano' })
  pruebas_satisfactorias?: boolean = true;

  @ApiPropertyOptional({
    description:
      'Observaciones técnicas u operativas al momento de la reconexión física en el aula',
    example:
      'Equipo reconectado en fila 2, columna 3. Señal de red Gigabit comprobada y periféricos operativos.',
  })
  @IsOptional()
  @IsString({ message: 'Las observaciones de instalación deben ser texto' })
  obs_instalacion?: string;

  @ApiPropertyOptional({
    description:
      'ID del usuario que confirma la recepción y puesta en marcha física en sala (si se desea sobreescribir al usuario del token)',
    example: 4,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'El ID de usuario confirmador debe ser numérico' })
  id_usuario_confirma?: number;
}
