import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuditoriaService } from './auditoria.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permisos } from '../auth/decorators/permisos.decorator';

@ApiTags('Auditoría')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get()
  @Permisos('SEG_AUDITORIA_VER')
  @ApiOperation({
    summary: 'CU4: Consultar bitácora de auditoría del sistema',
    description:
      'Devuelve los registros históricos de auditoría con filtros por tabla, acción, correo, ordenamiento y paginación.',
  })
  @ApiQuery({
    name: 'tabla',
    required: false,
    description: 'Filtrar por tabla afectada (ej: usuario, rol)',
  })
  @ApiQuery({
    name: 'accion',
    required: false,
    description: 'Filtrar por acción (ej: INSERT, UPDATE, DELETE, LOGIN)',
  })
  @ApiQuery({
    name: 'correo',
    required: false,
    description: 'Filtrar por correo de usuario',
  })
  @ApiQuery({
    name: 'pagina',
    required: false,
    description: 'Número de página (default 1)',
  })
  @ApiQuery({
    name: 'limite',
    required: false,
    description: 'Registros por página (default 15)',
  })
  @ApiQuery({
    name: 'ordenColumna',
    required: false,
    description: 'Columna para ordenar (id_auditoria o fecha_hora)',
  })
  @ApiQuery({
    name: 'ordenDireccion',
    required: false,
    description: 'Dirección de orden (ASC o DESC)',
  })
  @ApiResponse({ status: 200, description: 'Bitácora obtenida exitosamente' })
  findAll(
    @Query('tabla') tabla?: string,
    @Query('accion') accion?: string,
    @Query('correo') correo?: string,
    @Query('pagina') pagina?: number,
    @Query('limite') limite?: number,
    @Query('ordenColumna') ordenColumna?: string,
    @Query('ordenDireccion') ordenDireccion?: 'ASC' | 'DESC',
  ) {
    return this.auditoriaService.findAll({
      tabla,
      accion,
      correo,
      pagina: pagina ? Number(pagina) : 1,
      limite: limite ? Number(limite) : 15,
      ordenColumna,
      ordenDireccion,
    });
  }
}
