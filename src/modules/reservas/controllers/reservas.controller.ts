import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Ip,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ReservasService } from '../services/reservas.service';
import { SolicitarReservaDto } from '../dto/solicitar-reserva.dto';
import { EditarReservaDto } from '../dto/editar-reserva.dto';
import { ResponderReservaDto } from '../dto/responder-reserva.dto';
import { ConsultarReservasFiltroDto } from '../dto/consultar-reservas-filtro.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Permisos } from '../../auth/decorators/permisos.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Reservas Académicas y Disponibilidad')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reservas')
export class ReservasController {
  constructor(private readonly reservasService: ReservasService) {}

  @Post()
  @Permisos('RESERVAS_SOLICITAR')
  @ApiOperation({
    summary: 'CU16: Solicitar nueva reserva de aula de cómputo por docente',
  })
  @ApiResponse({
    status: 201,
    description: 'Reserva registrada en estado PENDIENTE',
  })
  solicitar(
    @Body() dto: SolicitarReservaDto,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    return this.reservasService.solicitar(dto, user, ip);
  }

  @Get()
  @Permisos('RESERVAS_CONSULTAR', 'RESERVAS_SOLICITAR', 'RESERVAS_GESTIONAR')
  @ApiOperation({
    summary: 'CU17: Consultar lista paginada de reservas con filtros',
  })
  listar(
    @Query() filtros: ConsultarReservasFiltroDto,
    @CurrentUser() user: any,
  ) {
    return this.reservasService.listar(filtros, user);
  }

  @Get('calendario')
  @Permisos('RESERVAS_CONSULTAR', 'RESERVAS_SOLICITAR', 'RESERVAS_GESTIONAR')
  @ApiOperation({
    summary:
      'CU17: Obtener reservas en rango de fechas para el calendario visual',
  })
  @ApiQuery({ name: 'id_sala', required: false, type: Number })
  @ApiQuery({ name: 'fecha_desde', required: false, type: String })
  @ApiQuery({ name: 'fecha_hasta', required: false, type: String })
  obtenerParaCalendario(
    @Query('id_sala') id_sala?: string,
    @Query('fecha_desde') fecha_desde?: string,
    @Query('fecha_hasta') fecha_hasta?: string,
  ) {
    const salaId = id_sala ? parseInt(id_sala, 10) : undefined;
    return this.reservasService.obtenerParaCalendario(
      salaId,
      fecha_desde,
      fecha_hasta,
    );
  }

  @Get('validar-disponibilidad')
  @Permisos('RESERVAS_SOLICITAR', 'RESERVAS_CONSULTAR', 'RESERVAS_GESTIONAR')
  @ApiOperation({
    summary: 'CU18: Validar no-solapamiento horario en tiempo real',
  })
  @ApiQuery({ name: 'id_sala', required: true, type: Number })
  @ApiQuery({ name: 'fecha', required: true, type: String })
  @ApiQuery({ name: 'hora_inicio', required: true, type: String })
  @ApiQuery({ name: 'hora_fin', required: true, type: String })
  @ApiQuery({ name: 'cant_alumnos', required: false, type: Number })
  @ApiQuery({ name: 'excluir_id', required: false, type: Number })
  validarDisponibilidad(
    @Query('id_sala', ParseIntPipe) id_sala: number,
    @Query('fecha') fecha: string,
    @Query('hora_inicio') hora_inicio: string,
    @Query('hora_fin') hora_fin: string,
    @Query('cant_alumnos') cant_alumnos?: string,
    @Query('excluir_id') excluir_id?: string,
  ) {
    const cant = cant_alumnos ? parseInt(cant_alumnos, 10) : undefined;
    const excluirId = excluir_id ? parseInt(excluir_id, 10) : undefined;
    return this.reservasService.validarDisponibilidad(
      id_sala,
      fecha,
      hora_inicio,
      hora_fin,
      cant,
      excluirId,
    );
  }

  @Get(':id')
  @Permisos('RESERVAS_CONSULTAR', 'RESERVAS_SOLICITAR', 'RESERVAS_GESTIONAR')
  @ApiOperation({ summary: 'Obtener detalle de una reserva por su ID' })
  obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    return this.reservasService.obtenerPorId(id);
  }

  @Patch(':id')
  @Permisos('RESERVAS_SOLICITAR', 'RESERVAS_GESTIONAR')
  @ApiOperation({
    summary:
      'Modificar/Editar reserva existente por docente titular o administrador',
  })
  @ApiResponse({ status: 200, description: 'Reserva modificada exitosamente' })
  editar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditarReservaDto,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    return this.reservasService.editar(id, dto, user, ip);
  }

  @Patch(':id/gestionar')
  @Permisos('RESERVAS_GESTIONAR')
  @ApiOperation({
    summary:
      'CU20: Aprobar o Rechazar solicitud de reserva formalmente por Jefatura',
  })
  gestionar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResponderReservaDto,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    return this.reservasService.gestionar(id, dto, user, ip);
  }

  @Patch(':id/marcar-leida')
  @Permisos('RESERVAS_CONSULTAR', 'RESERVAS_SOLICITAR', 'RESERVAS_GESTIONAR')
  @ApiOperation({
    summary:
      'Marcar notificación o modificación de reserva como leída/revisada',
  })
  marcarLeida(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    return this.reservasService.marcarLeida(id, user, ip);
  }

  @Patch(':id/cancelar')
  @Permisos('RESERVAS_CANCELAR')
  @ApiOperation({
    summary:
      'CU19: Cancelar reserva de sala por el docente solicitante o administrador',
  })
  cancelar(
    @Param('id', ParseIntPipe) id: number,
    @Body('motivo') motivo: string,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    return this.reservasService.cancelar(id, motivo, user, ip);
  }
}
