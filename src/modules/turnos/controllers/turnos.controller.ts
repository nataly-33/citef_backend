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
import { TurnosService } from '../services/turnos.service';
import { AbrirTurnoDto } from '../dto/abrir-turno.dto';
import { CerrarTurnoDto } from '../dto/cerrar-turno.dto';
import { CrearActaRelevoDto } from '../dto/crear-acta-relevo.dto';
import { FirmarActaRelevoDto } from '../dto/firmar-acta-relevo.dto';
import { FiltroJornadasDto } from '../dto/filtro-jornadas.dto';
import { FiltroActasDto } from '../dto/filtro-actas.dto';

@ApiTags('Turnos de Guardia y Relevo')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('turnos')
export class TurnosController {
  constructor(private readonly turnosService: TurnosService) {}

  @Post('apertura')
  @Permisos('TURNOS_APERTURA_CIERRE')
  @ApiOperation({
    summary:
      'CU21: Apertura de jornada de turno de guardia con checklist inicial',
  })
  async abrirTurno(
    @Body() dto: AbrirTurnoDto,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const idUsuario = req.user?.id_usuario || req.user?.id || 1;
    return this.turnosService.abrirTurno(dto, idUsuario, ip);
  }

  @Get('activa')
  @Permisos('TURNOS_APERTURA_CIERRE')
  @ApiOperation({
    summary: 'CU21: Obtener la jornada en curso activa para el auxiliar o sala',
  })
  async getJornadaActiva(@Query('id_sala') idSala?: string, @Req() req?: any) {
    const idUsuario = req?.user?.id_usuario || req?.user?.id;
    const salaId = idSala ? parseInt(idSala, 10) : undefined;
    return this.turnosService.getJornadaActiva(idUsuario, salaId);
  }

  @Post(':id/cierre')
  @Permisos('TURNOS_APERTURA_CIERRE')
  @ApiOperation({
    summary:
      'CU21: Cierre formal de turno de guardia y consolidación de métricas operativas',
  })
  async cerrarTurno(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CerrarTurnoDto,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const idUsuario = req.user?.id_usuario || req.user?.id || 1;
    return this.turnosService.cerrarTurno(id, dto, idUsuario, ip);
  }

  @Get('jornadas')
  @Permisos('TURNOS_APERTURA_CIERRE')
  @ApiOperation({
    summary: 'CU21: Listar historial paginado de jornadas de guardia',
  })
  async getJornadas(@Query() params: FiltroJornadasDto) {
    return this.turnosService.getJornadas(params);
  }

  @Post(':id/relevo')
  @Permisos('TURNOS_APERTURA_CIERRE')
  @ApiOperation({
    summary: 'CU21: Generar acta de relevo (Handover) al culminar guardia',
  })
  async crearActaRelevo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CrearActaRelevoDto,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const idUsuario = req.user?.id_usuario || req.user?.id || 1;
    return this.turnosService.crearActaRelevo(id, dto, idUsuario, ip);
  }

  @Get('actas')
  @Permisos('TURNOS_APERTURA_CIERRE')
  @ApiOperation({
    summary: 'CU21: Listar historial paginado de actas de relevo',
  })
  async getActas(@Query() params: FiltroActasDto) {
    return this.turnosService.getActas(params);
  }

  @Get('actas/:id')
  @Permisos('TURNOS_APERTURA_CIERRE')
  @ApiOperation({
    summary: 'CU21: Obtener detalle de un acta de relevo por ID',
  })
  async getActaById(@Param('id', ParseIntPipe) id: number) {
    return this.turnosService.getActaById(id);
  }

  @Post('actas/:id/firmar')
  @Permisos('TURNOS_APERTURA_CIERRE')
  @ApiOperation({
    summary:
      'CU21: Firma digital y conformidad del acta de relevo por el auxiliar entrante (POST)',
  })
  async firmarActaRelevoPost(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FirmarActaRelevoDto,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const idUsuario = req.user?.id_usuario || req.user?.id || 1;
    return this.turnosService.firmarActaRelevo(id, dto, idUsuario, ip);
  }

  @Patch('actas/:id/firmar')
  @Permisos('TURNOS_APERTURA_CIERRE')
  @ApiOperation({
    summary:
      'CU21: Firma digital y conformidad del acta de relevo por el auxiliar entrante (PATCH)',
  })
  async firmarActaRelevoPatch(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FirmarActaRelevoDto,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const idUsuario = req.user?.id_usuario || req.user?.id || 1;
    return this.turnosService.firmarActaRelevo(id, dto, idUsuario, ip);
  }

  @Get('dashboard-salas')
  @Permisos('TURNOS_APERTURA_CIERRE')
  @ApiOperation({
    summary:
      'CU21: Monitoreo en tiempo real de guardias activas por sala para Jefatura / Administrador',
  })
  async getDashboardSalas() {
    return this.turnosService.getDashboardSalas();
  }

  @Get('auxiliares')
  @Permisos('TURNOS_APERTURA_CIERRE')
  @ApiOperation({
    summary: 'CU21: Listar auxiliares disponibles para asignación de relevo',
  })
  async getAuxiliaresParaRelevo() {
    return this.turnosService.getAuxiliaresParaRelevo();
  }
}
