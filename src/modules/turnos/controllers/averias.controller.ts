import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  Ip,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Permisos } from '../../auth/decorators/permisos.decorator';
import { AveriasService } from '../services/averias.service';
import { ReportarAveriaDto } from '../dto/reportar-averia.dto';
import { ActualizarAveriaDto } from '../dto/actualizar-averia.dto';
import { FiltroAveriasDto } from '../dto/filtro-averias.dto';

@ApiTags('Incidencias y Averías Técnicas')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('turnos/averias')
export class AveriasController {
  constructor(private readonly averiasService: AveriasService) {}

  @Post()
  @Permisos('TURNOS_INCIDENCIAS_REPORTAR')
  @ApiOperation({
    summary:
      'CU22: Reportar avería técnica en computadora vinculando contextualmente al último estudiante',
  })
  async reportarAveria(
    @Body() dto: ReportarAveriaDto,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const idUsuario = req.user?.id_usuario || req.user?.id || 1;
    return this.averiasService.reportarAveria(dto, idUsuario, ip);
  }

  @Get()
  @Permisos('TURNOS_INCIDENCIAS_REPORTAR')
  @ApiOperation({
    summary: 'CU22: Listar averías técnicas con paginación y filtros',
  })
  async getAverias(@Query() params: FiltroAveriasDto) {
    return this.averiasService.getAverias(params);
  }

  @Get('ultimo-usuario/:idComputadora')
  @Permisos('TURNOS_INCIDENCIAS_REPORTAR')
  @ApiOperation({
    summary:
      'CU22: Obtener último estudiante o contexto de uso de una computadora para prellenado',
  })
  async getUltimoUsuarioComputadora(
    @Param('idComputadora', ParseIntPipe) idComputadora: number,
  ) {
    return this.averiasService.getUltimoUsuarioComputadora(idComputadora);
  }

  @Patch(':id/estado')
  @Permisos('TURNOS_INCIDENCIAS_REPORTAR')
  @ApiOperation({
    summary:
      'CU22: Actualizar estado técnico de una avería y restablecer equipo a DISPONIBLE si reparado',
  })
  async cambiarEstadoAveria(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarAveriaDto,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const idUsuario = req.user?.id_usuario || req.user?.id || 1;
    return this.averiasService.cambiarEstadoAveria(id, dto, idUsuario, ip);
  }

  @Get(':id')
  @Permisos('TURNOS_INCIDENCIAS_REPORTAR')
  @ApiOperation({
    summary: 'CU22: Obtener detalle técnico de una avería por ID',
  })
  async getAveriaById(@Param('id', ParseIntPipe) id: number) {
    return this.averiasService.getAveriaById(id);
  }
}
