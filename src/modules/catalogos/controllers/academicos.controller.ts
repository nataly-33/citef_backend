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
import { CarrerasService } from '../services/carreras.service';
import { MateriasService } from '../services/materias.service';
import { CrearCarreraDto } from '../dto/crear-carrera.dto';
import { ActualizarCarreraDto } from '../dto/actualizar-carrera.dto';
import { CrearMateriaDto } from '../dto/crear-materia.dto';
import { ActualizarMateriaDto } from '../dto/actualizar-materia.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Permisos } from '../../auth/decorators/permisos.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Catálogos Académicos')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Permisos('CAT_ACADEMICOS_GESTIONAR')
@Controller('catalogos')
export class AcademicosController {
  constructor(
    private readonly carrerasService: CarrerasService,
    private readonly materiasService: MateriasService,
  ) {}

  // ----------------------------------------------------
  // CARRERAS (/api/v1/catalogos/carreras)
  // ----------------------------------------------------

  @Get('carreras')
  @Permisos(
    'CAT_ACADEMICOS_GESTIONAR',
    'TIEMPOREAL_ASIGNAR',
    'TIEMPOREAL_MONITOREAR',
    'TIEMPOREAL_ASISTENCIAS',
  )
  @ApiOperation({
    summary: 'CU5: Listar carreras académicas con paginación de 15 filas y búsqueda',
  })
  @ApiQuery({ name: 'pagina', required: false, type: Number })
  @ApiQuery({ name: 'limite', required: false, type: Number })
  @ApiQuery({ name: 'busqueda', required: false, type: String })
  @ApiQuery({ name: 'activo', required: false, type: Boolean })
  @ApiQuery({ name: 'todos', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Listado de carreras obtenido exitosamente' })
  findAllCarreras(
    @Query('pagina') pagina?: number,
    @Query('limite') limite?: number,
    @Query('busqueda') busqueda?: string,
    @Query('activo') activo?: string,
    @Query('todos') todos?: string,
  ) {
    const activoBool =
      activo !== undefined ? activo === 'true' || activo === '1' : undefined;
    const todosBool = todos === 'true' || todos === '1';

    return this.carrerasService.findAll({
      pagina: pagina ? Number(pagina) : 1,
      limite: limite ? Number(limite) : 15,
      busqueda,
      activo: activoBool,
      todos: todosBool,
    });
  }

  @Get('carreras/todas')
  @Permisos(
    'CAT_ACADEMICOS_GESTIONAR',
    'TIEMPOREAL_ASIGNAR',
    'TIEMPOREAL_MONITOREAR',
    'TIEMPOREAL_ASISTENCIAS',
  )
  @ApiOperation({ summary: 'CU5: Obtener todas las carreras activas para selectores' })
  findAllCarrerasDropdown() {
    return this.carrerasService.findAll({ todos: true, activo: true });
  }

  @Get('carreras/:id')
  @Permisos(
    'CAT_ACADEMICOS_GESTIONAR',
    'TIEMPOREAL_ASIGNAR',
    'TIEMPOREAL_MONITOREAR',
    'TIEMPOREAL_ASISTENCIAS',
  )
  @ApiOperation({ summary: 'CU5: Obtener detalle de carrera por ID con sus materias' })
  findOneCarrera(@Param('id', ParseIntPipe) id: number) {
    return this.carrerasService.findOne(id);
  }

  @Post('carreras')
  @ApiOperation({ summary: 'CU5: Registrar nueva carrera profesional' })
  @ApiResponse({ status: 201, description: 'Carrera registrada exitosamente' })
  crearCarrera(
    @Body() dto: CrearCarreraDto,
    @CurrentUser() ejecutor: any,
    @Ip() ip: string,
  ) {
    return this.carrerasService.crear(dto, ejecutor, ip);
  }

  @Put('carreras/:id')
  @ApiOperation({ summary: 'CU5: Actualizar datos de una carrera' })
  actualizarCarrera(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarCarreraDto,
    @CurrentUser() ejecutor: any,
    @Ip() ip: string,
  ) {
    return this.carrerasService.actualizar(id, dto, ejecutor, ip);
  }

  @Patch('carreras/:id/estado')
  @ApiOperation({ summary: 'CU5: Cambiar estado activo/inactivo de una carrera' })
  cambiarEstadoCarrera(
    @Param('id', ParseIntPipe) id: number,
    @Body('activo') activo: boolean,
    @CurrentUser() ejecutor: any,
    @Ip() ip: string,
  ) {
    return this.carrerasService.cambiarEstado(id, activo, ejecutor, ip);
  }

  @Delete('carreras/:id')
  @ApiOperation({ summary: 'CU5: Desactivar carrera académica (baja lógica)' })
  eliminarCarrera(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() ejecutor: any,
    @Ip() ip: string,
  ) {
    return this.carrerasService.eliminar(id, ejecutor, ip);
  }

  // ----------------------------------------------------
  // MATERIAS (/api/v1/catalogos/materias)
  // ----------------------------------------------------

  @Get('materias')
  @Permisos(
    'CAT_ACADEMICOS_GESTIONAR',
    'TIEMPOREAL_ASIGNAR',
    'TIEMPOREAL_MONITOREAR',
    'TIEMPOREAL_ASISTENCIAS',
  )
  @ApiOperation({
    summary: 'CU5: Listar materias con filtro por carrera, semestre y paginación',
  })
  @ApiQuery({ name: 'pagina', required: false, type: Number })
  @ApiQuery({ name: 'limite', required: false, type: Number })
  @ApiQuery({ name: 'id_carrera', required: false, type: Number })
  @ApiQuery({ name: 'semestre', required: false, type: Number })
  @ApiQuery({ name: 'semestre_nivel', required: false, type: Number })
  @ApiQuery({ name: 'busqueda', required: false, type: String })
  @ApiQuery({ name: 'activo', required: false, type: Boolean })
  @ApiQuery({ name: 'todos', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Listado de materias obtenido exitosamente' })
  findAllMaterias(
    @Query('pagina') pagina?: number,
    @Query('limite') limite?: number,
    @Query('id_carrera') idCarrera?: number,
    @Query('semestre') semestre?: number,
    @Query('semestre_nivel') semestreNivel?: number,
    @Query('busqueda') busqueda?: string,
    @Query('activo') activo?: string,
    @Query('todos') todos?: string,
  ) {
    const activoBool =
      activo !== undefined ? activo === 'true' || activo === '1' : undefined;
    const todosBool = todos === 'true' || todos === '1';
    const sem =
      semestre !== undefined && semestre !== null && String(semestre) !== ''
        ? Number(semestre)
        : semestreNivel !== undefined && semestreNivel !== null && String(semestreNivel) !== ''
        ? Number(semestreNivel)
        : undefined;

    return this.materiasService.findAll({
      pagina: pagina ? Number(pagina) : 1,
      limite: limite ? Number(limite) : 15,
      id_carrera: idCarrera ? Number(idCarrera) : undefined,
      semestre: sem,
      busqueda,
      activo: activoBool,
      todos: todosBool,
    });
  }

  @Get('materias/todas')
  @Permisos(
    'CAT_ACADEMICOS_GESTIONAR',
    'TIEMPOREAL_ASIGNAR',
    'TIEMPOREAL_MONITOREAR',
    'TIEMPOREAL_ASISTENCIAS',
  )
  @ApiOperation({ summary: 'CU5: Obtener todas las materias activas para selectores' })
  findAllMateriasDropdown() {
    return this.materiasService.findAll({ todos: true, activo: true });
  }

  @Get('materias/:id')
  @Permisos(
    'CAT_ACADEMICOS_GESTIONAR',
    'TIEMPOREAL_ASIGNAR',
    'TIEMPOREAL_MONITOREAR',
    'TIEMPOREAL_ASISTENCIAS',
  )
  @ApiOperation({ summary: 'CU5: Obtener detalle de materia por ID' })
  findOneMateria(@Param('id', ParseIntPipe) id: number) {
    return this.materiasService.findOne(id);
  }

  @Post('materias')
  @ApiOperation({ summary: 'CU5: Registrar nueva materia en una carrera' })
  @ApiResponse({ status: 201, description: 'Materia registrada exitosamente' })
  crearMateria(
    @Body() dto: CrearMateriaDto,
    @CurrentUser() ejecutor: any,
    @Ip() ip: string,
  ) {
    return this.materiasService.crear(dto, ejecutor, ip);
  }

  @Put('materias/:id')
  @ApiOperation({ summary: 'CU5: Actualizar datos de una materia' })
  actualizarMateria(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarMateriaDto,
    @CurrentUser() ejecutor: any,
    @Ip() ip: string,
  ) {
    return this.materiasService.actualizar(id, dto, ejecutor, ip);
  }

  @Patch('materias/:id/estado')
  @ApiOperation({ summary: 'CU5: Cambiar estado activo/inactivo de una materia' })
  cambiarEstadoMateria(
    @Param('id', ParseIntPipe) id: number,
    @Body('activo') activo: boolean,
    @CurrentUser() ejecutor: any,
    @Ip() ip: string,
  ) {
    return this.materiasService.cambiarEstado(id, activo, ejecutor, ip);
  }

  @Delete('materias/:id')
  @ApiOperation({ summary: 'CU5: Desactivar materia (baja lógica)' })
  eliminarMateria(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() ejecutor: any,
    @Ip() ip: string,
  ) {
    return this.materiasService.eliminar(id, ejecutor, ip);
  }
}
