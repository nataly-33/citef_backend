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
import { TurnosAuxiliaresService } from '../services/turnos-auxiliares.service';
import { AsignarTurnoDto } from '../dto/asignar-turno.dto';
import { ActualizarTurnoDto } from '../dto/actualizar-turno.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Permisos } from '../../auth/decorators/permisos.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Turnos de Auxiliares')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Permisos('CAT_ASIGNAR_TURNOS')
@Controller('turnos-auxiliares')
export class TurnosAuxiliaresController {
  constructor(
    private readonly turnosService: TurnosAuxiliaresService,
  ) {}

  @Get('auxiliares-disponibles')
  @ApiOperation({
    summary: 'CU8: Listar usuarios con rol AUXILIAR disponibles para asignación de turnos',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios con rol AUXILIAR obtenida exitosamente',
  })
  listarAuxiliaresDisponibles() {
    return this.turnosService.listarAuxiliaresDisponibles();
  }

  @Get()
  @ApiOperation({
    summary: 'CU8: Listar asignaciones semestrales de turnos con paginación de 15 filas',
  })
  @ApiQuery({ name: 'pagina', required: false, type: Number })
  @ApiQuery({ name: 'limite', required: false, type: Number })
  @ApiQuery({ name: 'semestre', required: false, type: String })
  @ApiQuery({ name: 'id_usuario', required: false, type: Number })
  @ApiQuery({ name: 'activo', required: false, type: Boolean })
  @ApiQuery({ name: 'todos', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Listado de asignaciones obtenido' })
  findAll(
    @Query('pagina') pagina?: number,
    @Query('limite') limite?: number,
    @Query('semestre') semestre?: string,
    @Query('id_usuario') idUsuario?: number,
    @Query('activo') activo?: string,
    @Query('todos') todos?: string,
  ) {
    const activoBool =
      activo !== undefined ? activo === 'true' || activo === '1' : undefined;
    const todosBool = todos === 'true' || todos === '1';

    return this.turnosService.findAll({
      pagina: pagina ? Number(pagina) : 1,
      limite: limite ? Number(limite) : 15,
      semestre,
      id_usuario: idUsuario ? Number(idUsuario) : undefined,
      activo: activoBool,
      todos: todosBool,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'CU8: Obtener detalle de asignación de turno por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.turnosService.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'CU8: Asignar turno semestral fijo a un auxiliar (con validación de rol y no superposición)',
  })
  @ApiResponse({ status: 201, description: 'Turno asignado exitosamente' })
  asignarTurno(
    @Body() dto: AsignarTurnoDto,
    @CurrentUser() ejecutor: any,
    @Ip() ip: string,
  ) {
    return this.turnosService.asignarTurno(dto, ejecutor, ip);
  }

  @Put(':id')
  @ApiOperation({ summary: 'CU8: Modificar horario o periodo de un turno asignado' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarTurnoDto,
    @CurrentUser() ejecutor: any,
    @Ip() ip: string,
  ) {
    return this.turnosService.actualizar(id, dto, ejecutor, ip);
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'CU8: Cambiar estado activo/inactivo de una asignación' })
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body('activo') activo: boolean,
    @CurrentUser() ejecutor: any,
    @Ip() ip: string,
  ) {
    return this.turnosService.cambiarEstado(id, activo, ejecutor, ip);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'CU8: Desactivar o anular asignación de turno' })
  eliminar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() ejecutor: any,
    @Ip() ip: string,
  ) {
    return this.turnosService.eliminar(id, ejecutor, ip);
  }
}

// Alias Controller para soportar /api/v1/auxiliares-disponibles directamente
@ApiTags('Turnos de Auxiliares')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Permisos('CAT_ASIGNAR_TURNOS')
@Controller('auxiliares-disponibles')
export class AuxiliaresDisponiblesController {
  constructor(
    private readonly turnosService: TurnosAuxiliaresService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'CU8: Listar usuarios con rol AUXILIAR (ruta directa /api/v1/auxiliares-disponibles)',
  })
  listarAuxiliares() {
    return this.turnosService.listarAuxiliaresDisponibles();
  }
}
