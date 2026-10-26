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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Permisos } from '../../auth/decorators/permisos.decorator';
import { SoporteService } from '../services/soporte.service';
import { CrearOrdenTallerDto } from '../dto/crear-orden-taller.dto';
import { IniciarMantenimientoDto } from '../dto/iniciar-mantenimiento.dto';
import { FinalizarMantenimientoDto } from '../dto/finalizar-mantenimiento.dto';
import { ConfirmarRetornoDto } from '../dto/confirmar-retorno.dto';
import { FiltroMantenimientoDto } from '../dto/filtro-mantenimiento.dto';
import { DarBajaDto } from '../dto/dar-baja.dto';

@ApiTags('Soporte Técnico y Confiabilidad RAMS')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('soporte')
export class SoporteController {
  constructor(private readonly soporteService: SoporteService) {}

  // -------------------------------------------------------------
  // CU24: GESTIÓN DE ÓRDENES DE TALLER
  // -------------------------------------------------------------

  @Post('taller')
  @Permisos('SOPORTE_MANTENIMIENTO_REGISTRAR')
  @ApiOperation({
    summary:
      'CU24: Crear orden de ingreso a taller para mantenimiento preventivo o correctivo',
  })
  async crearOrden(
    @Body() dto: CrearOrdenTallerDto,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const idUsuario = req.user?.id_usuario || req.user?.id || 1;
    return this.soporteService.crearOrdenTaller(dto, idUsuario, ip);
  }

  @Get('tecnicos')
  @Permisos('ver_soporte_taller', 'administrar_turnos_guardia')
  @ApiOperation({
    summary: 'Obtener lista de técnicos activos',
  })
  async getTecnicos() {
    return this.soporteService.getTecnicos();
  }

  @Get('taller')
  @Permisos('SOPORTE_MANTENIMIENTO_REGISTRAR')
  @ApiOperation({
    summary:
      'CU24: Listar órdenes de taller con soporte dual de paginación (page/limit y pagina/limite)',
  })
  async getOrdenes(
    @Query() params: FiltroMantenimientoDto,
    @Req() req: any,
  ) {
    const idUsuario = req.user?.id_usuario;
    const roles = req.user?.roles || [];
    return this.soporteService.getOrdenesTaller(params, idUsuario, roles);
  }

  @Get('taller/:id')
  @Permisos('SOPORTE_MANTENIMIENTO_REGISTRAR')
  @ApiOperation({
    summary: 'CU24: Obtener detalle técnico de una orden de taller por ID',
  })
  @ApiParam({ name: 'id', description: 'ID de la orden de taller' })
  async getOrdenById(@Param('id', ParseIntPipe) id: number) {
    return this.soporteService.getOrdenById(id);
  }

  // --- INICIAR REPARACIÓN (soporte dual PATCH y POST) ---

  @Patch('taller/:id/iniciar')
  @Permisos('SOPORTE_MANTENIMIENTO_REGISTRAR')
  @ApiOperation({
    summary: 'CU24: Iniciar reparación técnica en banco de trabajo (vía PATCH)',
  })
  @ApiParam({ name: 'id', description: 'ID de la orden de taller' })
  async iniciarReparacionPatch(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: IniciarMantenimientoDto,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const idUsuario = req.user?.id_usuario || req.user?.id || 1;
    return this.soporteService.iniciarReparacion(id, dto, idUsuario, ip);
  }

  @Post('taller/:id/iniciar')
  @Permisos('SOPORTE_MANTENIMIENTO_REGISTRAR')
  @ApiOperation({
    summary: 'CU24: Iniciar reparación técnica en banco de trabajo (vía POST)',
  })
  @ApiParam({ name: 'id', description: 'ID de la orden de taller' })
  async iniciarReparacionPost(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: IniciarMantenimientoDto,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const idUsuario = req.user?.id_usuario || req.user?.id || 1;
    return this.soporteService.iniciarReparacion(id, dto, idUsuario, ip);
  }

  // --- FINALIZAR REPARACIÓN (soporte dual PATCH y POST) ---

  @Patch('taller/:id/finalizar')
  @Permisos('SOPORTE_MANTENIMIENTO_REGISTRAR')
  @ApiOperation({
    summary:
      'CU24: Finalizar intervención técnica en taller registrando piezas y duración (vía PATCH)',
  })
  @ApiParam({ name: 'id', description: 'ID de la orden de taller' })
  async finalizarReparacionPatch(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FinalizarMantenimientoDto,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const idUsuario = req.user?.id_usuario || req.user?.id || 1;
    return this.soporteService.finalizarReparacion(id, dto, idUsuario, ip);
  }

  @Post('taller/:id/finalizar')
  @Permisos('SOPORTE_MANTENIMIENTO_REGISTRAR')
  @ApiOperation({
    summary:
      'CU24: Finalizar intervención técnica en taller registrando piezas y duración (vía POST)',
  })
  @ApiParam({ name: 'id', description: 'ID de la orden de taller' })
  async finalizarReparacionPost(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FinalizarMantenimientoDto,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const idUsuario = req.user?.id_usuario || req.user?.id || 1;
    return this.soporteService.finalizarReparacion(id, dto, idUsuario, ip);
  }

  // --- CU25: CONFIRMAR RETORNO A SALA (soporte dual POST y PATCH) ---

  @Post('taller/:id/retorno')
  @Permisos('SOPORTE_RETORNO_CONFIRMAR')
  @ApiOperation({
    summary:
      'CU25: Confirmar retorno físico a sala, reactivar disponibilidad y recalcular RAMS (vía POST)',
  })
  @ApiParam({ name: 'id', description: 'ID de la orden de taller' })
  async confirmarRetornoPost(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmarRetornoDto,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const idUsuario = req.user?.id_usuario || req.user?.id || 1;
    return this.soporteService.confirmarRetornoSala(id, dto, idUsuario, ip);
  }

  @Patch('taller/:id/retorno')
  @Permisos('SOPORTE_RETORNO_CONFIRMAR')
  @ApiOperation({
    summary:
      'CU25: Confirmar retorno físico a sala, reactivar disponibilidad y recalcular RAMS (vía PATCH)',
  })
  @ApiParam({ name: 'id', description: 'ID de la orden de taller' })
  async confirmarRetornoPatch(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmarRetornoDto,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const idUsuario = req.user?.id_usuario || req.user?.id || 1;
    return this.soporteService.confirmarRetornoSala(id, dto, idUsuario, ip);
  }

  // --- DAR DE BAJA DEFINITIVA (soporte dual POST y PATCH) ---

  @Post('taller/:id/baja')
  @Permisos('SOPORTE_MANTENIMIENTO_REGISTRAR')
  @ApiOperation({
    summary:
      'CU24: Declarar baja técnica definitiva de máquina irreparable (vía POST)',
  })
  @ApiParam({ name: 'id', description: 'ID de la orden de taller' })
  async darDeBajaPost(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DarBajaDto,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const idUsuario = req.user?.id_usuario || req.user?.id || 1;
    return this.soporteService.darDeBaja(id, dto.motivo, idUsuario, ip);
  }

  @Patch('taller/:id/baja')
  @Permisos('SOPORTE_MANTENIMIENTO_REGISTRAR')
  @ApiOperation({
    summary:
      'CU24: Declarar baja técnica definitiva de máquina irreparable (vía PATCH)',
  })
  @ApiParam({ name: 'id', description: 'ID de la orden de taller' })
  async darDeBajaPatch(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DarBajaDto,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const idUsuario = req.user?.id_usuario || req.user?.id || 1;
    return this.soporteService.darDeBaja(id, dto.motivo, idUsuario, ip);
  }

  // -------------------------------------------------------------
  // TABLERO Y MÉTRICAS RAMS
  // -------------------------------------------------------------

  @Get('rams/dashboard')
  @Permisos('SOPORTE_MANTENIMIENTO_REGISTRAR')
  @ApiOperation({
    summary:
      'CU25: Obtener tablero consolidado de métricas RAMS (MTBF, MTTR, Disponibilidad A)',
  })
  @ApiQuery({ name: 'id_sala', required: false, type: Number })
  @ApiQuery({ name: 'mes', required: false, type: Number })
  @ApiQuery({ name: 'anio', required: false, type: Number })
  async getDashboardRams(
    @Query('id_sala') idSala?: number,
    @Query('mes') mes?: number,
    @Query('anio') anio?: number,
  ) {
    return this.soporteService.getMetricasRamsDashboard({
      id_sala: idSala ? Number(idSala) : undefined,
      mes: mes ? Number(mes) : undefined,
      anio: anio ? Number(anio) : undefined,
    });
  }

  @Post('rams/recalcular')
  @Permisos('SOPORTE_MANTENIMIENTO_REGISTRAR')
  @ApiOperation({
    summary: 'Recalcular indicadores RAMS bajo demanda',
  })
  async recalcularRams(
    @Body()
    body: {
      id_computadora?: number;
      id_sala?: number;
      mes?: number;
      anio?: number;
    },
  ) {
    return this.soporteService.recalcularRams(
      body.id_computadora,
      body.id_sala,
      body.mes,
      body.anio,
    );
  }

  @Get('rams/computadora/:id')
  @Permisos('SOPORTE_MANTENIMIENTO_REGISTRAR')
  @ApiOperation({
    summary:
      'Obtener indicadores RAMS de una computadora específica para un periodo',
  })
  @ApiParam({ name: 'id', description: 'ID de la computadora' })
  @ApiQuery({ name: 'mes', required: false, type: Number })
  @ApiQuery({ name: 'anio', required: false, type: Number })
  async getRamsComputadora(
    @Param('id', ParseIntPipe) id: number,
    @Query('mes') mes?: number,
    @Query('anio') anio?: number,
  ) {
    return this.soporteService.recalcularRams(
      id,
      undefined,
      mes ? Number(mes) : undefined,
      anio ? Number(anio) : undefined,
    );
  }

  @Get('rams/sala/:id')
  @Permisos('SOPORTE_MANTENIMIENTO_REGISTRAR')
  @ApiOperation({
    summary:
      'Obtener indicadores RAMS consolidados de una sala específica para un periodo',
  })
  @ApiParam({ name: 'id', description: 'ID de la sala' })
  @ApiQuery({ name: 'mes', required: false, type: Number })
  @ApiQuery({ name: 'anio', required: false, type: Number })
  async getRamsSala(
    @Param('id', ParseIntPipe) id: number,
    @Query('mes') mes?: number,
    @Query('anio') anio?: number,
  ) {
    return this.soporteService.recalcularRams(
      undefined,
      id,
      mes ? Number(mes) : undefined,
      anio ? Number(anio) : undefined,
    );
  }
}
