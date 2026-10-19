import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
import { MotivosService } from '../services/motivos.service';
import { HorariosService } from '../services/horarios.service';
import { CrearMotivoDto } from '../dto/crear-motivo.dto';
import { ActualizarMotivoDto } from '../dto/actualizar-motivo.dto';
import { CrearHorarioDto } from '../dto/crear-horario.dto';
import { ActualizarHorarioDto } from '../dto/actualizar-horario.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Permisos } from '../../auth/decorators/permisos.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Catálogos Operativos')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Permisos('CAT_HORARIOS_GESTIONAR', 'CAT_ASIGNAR_TURNOS')
@Controller('catalogos')
export class OperativosController {
  constructor(
    private readonly motivosService: MotivosService,
    private readonly horariosService: HorariosService,
  ) {}

  // ----------------------------------------------------
  // MOTIVOS DE USO (/api/v1/catalogos/motivos)
  // ----------------------------------------------------

  @Get('motivos')
  @Permisos(
    'CAT_HORARIOS_GESTIONAR',
    'CAT_ASIGNAR_TURNOS',
    'TIEMPOREAL_ASIGNAR',
    'TIEMPOREAL_MONITOREAR',
    'TIEMPOREAL_ASISTENCIAS',
  )
  @ApiOperation({
    summary: 'CU6: Listar motivos de uso con filtro por tipo y paginación de 15 filas',
  })
  @ApiQuery({ name: 'pagina', required: false, type: Number })
  @ApiQuery({ name: 'limite', required: false, type: Number })
  @ApiQuery({ name: 'tipo', required: false, type: String })
  @ApiQuery({ name: 'busqueda', required: false, type: String })
  @ApiQuery({ name: 'activo', required: false, type: Boolean })
  @ApiQuery({ name: 'todos', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Listado de motivos de uso obtenido' })
  findAllMotivos(
    @Query('pagina') pagina?: number,
    @Query('limite') limite?: number,
    @Query('tipo') tipo?: string,
    @Query('busqueda') busqueda?: string,
    @Query('activo') activo?: string,
    @Query('todos') todos?: string,
  ) {
    const activoBool =
      activo !== undefined ? activo === 'true' || activo === '1' : undefined;
    const todosBool = todos === 'true' || todos === '1';

    return this.motivosService.findAll({
      pagina: pagina ? Number(pagina) : 1,
      limite: limite ? Number(limite) : 15,
      tipo,
      busqueda,
      activo: activoBool,
      todos: todosBool,
    });
  }

  @Get('motivos/:id')
  @Permisos(
    'CAT_HORARIOS_GESTIONAR',
    'CAT_ASIGNAR_TURNOS',
    'TIEMPOREAL_ASIGNAR',
    'TIEMPOREAL_MONITOREAR',
    'TIEMPOREAL_ASISTENCIAS',
  )
  @ApiOperation({ summary: 'CU6: Obtener detalle de motivo por ID' })
  findOneMotivo(@Param('id', ParseIntPipe) id: number) {
    return this.motivosService.findOne(id);
  }

  @Post('motivos')
  @ApiOperation({ summary: 'CU6: Registrar nuevo motivo de uso de sala' })
  @ApiResponse({ status: 201, description: 'Motivo creado exitosamente' })
  crearMotivo(
    @Body() dto: CrearMotivoDto,
    @CurrentUser() ejecutor: any,
    @Ip() ip: string,
  ) {
    return this.motivosService.crear(dto, ejecutor, ip);
  }

  @Put('motivos/:id')
  @ApiOperation({ summary: 'CU6: Actualizar motivo de uso' })
  actualizarMotivo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarMotivoDto,
    @CurrentUser() ejecutor: any,
    @Ip() ip: string,
  ) {
    return this.motivosService.actualizar(id, dto, ejecutor, ip);
  }

  @Patch('motivos/:id/estado')
  @ApiOperation({ summary: 'CU6: Cambiar estado activo/inactivo de un motivo' })
  cambiarEstadoMotivo(
    @Param('id', ParseIntPipe) id: number,
    @Body('activo') activo: boolean,
    @CurrentUser() ejecutor: any,
    @Ip() ip: string,
  ) {
    return this.motivosService.cambiarEstado(id, activo, ejecutor, ip);
  }

  @Delete('motivos/:id')
  @ApiOperation({ summary: 'CU6: Desactivar motivo de uso' })
  eliminarMotivo(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() ejecutor: any,
    @Ip() ip: string,
  ) {
    return this.motivosService.eliminar(id, ejecutor, ip);
  }

  // ----------------------------------------------------
  // HORARIOS OPERATIVOS (/api/v1/catalogos/horarios)
  // ----------------------------------------------------

  @Get('horarios')
  @ApiOperation({
    summary: 'CU6: Listar franjas horarias operativas con paginación de 15 filas',
  })
  @ApiQuery({ name: 'pagina', required: false, type: Number })
  @ApiQuery({ name: 'limite', required: false, type: Number })
  @ApiQuery({ name: 'turno', required: false, type: String })
  @ApiQuery({ name: 'activo', required: false, type: Boolean })
  @ApiQuery({ name: 'todos', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Listado de franjas horarias obtenido' })
  findAllHorarios(
    @Query('pagina') pagina?: number,
    @Query('limite') limite?: number,
    @Query('turno') turno?: string,
    @Query('activo') activo?: string,
    @Query('todos') todos?: string,
  ) {
    const activoBool =
      activo !== undefined ? activo === 'true' || activo === '1' : undefined;
    const todosBool = todos === 'true' || todos === '1';

    return this.horariosService.findAll({
      pagina: pagina ? Number(pagina) : 1,
      limite: limite ? Number(limite) : 15,
      turno,
      activo: activoBool,
      todos: todosBool,
    });
  }

  @Get('horarios/todos')
  @ApiOperation({
    summary: 'CU6/CU8: Listar todas las franjas horarias operativas activas para selectores',
  })
  findAllHorariosTodos() {
    return this.horariosService.findAll({ todos: true, activo: true });
  }

  @Get('horarios/:id')
  @ApiOperation({ summary: 'CU6: Obtener detalle de horario por ID' })
  findOneHorario(@Param('id', ParseIntPipe) id: number) {
    return this.horariosService.findOne(id);
  }

  @Post('horarios')
  @ApiOperation({ summary: 'CU6: Registrar nueva franja horaria operativa' })
  @ApiResponse({ status: 201, description: 'Horario registrado exitosamente' })
  crearHorario(
    @Body() dto: CrearHorarioDto,
    @CurrentUser() ejecutor: any,
    @Ip() ip: string,
  ) {
    return this.horariosService.crear(dto, ejecutor, ip);
  }

  @Put('horarios/:id')
  @ApiOperation({ summary: 'CU6: Actualizar franja horaria operativa' })
  actualizarHorario(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarHorarioDto,
    @CurrentUser() ejecutor: any,
    @Ip() ip: string,
  ) {
    return this.horariosService.actualizar(id, dto, ejecutor, ip);
  }

  @Patch('horarios/:id/estado')
  @ApiOperation({ summary: 'CU6: Cambiar estado activo/inactivo de un horario' })
  cambiarEstadoHorario(
    @Param('id', ParseIntPipe) id: number,
    @Body('activo') activo: boolean,
    @CurrentUser() ejecutor: any,
    @Ip() ip: string,
  ) {
    return this.horariosService.cambiarEstado(id, activo, ejecutor, ip);
  }

  @Delete('horarios/:id')
  @ApiOperation({ summary: 'CU6: Desactivar franja horaria operativa' })
  eliminarHorario(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() ejecutor: any,
    @Ip() ip: string,
  ) {
    return this.horariosService.eliminar(id, ejecutor, ip);
  }
}
