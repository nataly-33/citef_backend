import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Ip,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Permisos } from '../../auth/decorators/permisos.decorator';
import { OcupacionService } from '../services/ocupacion.service';
import { EstudiantesService } from '../services/estudiantes.service';
import { ColasEsperaService } from '../services/colas-espera.service';
import { AsignarEquipoDto } from '../dto/asignar-equipo.dto';
import { LiberarEquipoDto } from '../dto/liberar-equipo.dto';
import { EncolarEstudianteDto } from '../dto/encolar-estudiante.dto';
import { RegistrarEstudianteDto } from '../dto/registrar-estudiante.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Ocupación y Tiempo Real')
@Controller('ocupacion')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OcupacionController {
  constructor(
    private readonly ocupacionService: OcupacionService,
    private readonly estudiantesService: EstudiantesService,
    private readonly colasEsperaService: ColasEsperaService,
  ) {}

  @Get('salas/:id')
  @Permisos('TIEMPOREAL_MONITOREAR', 'TIEMPOREAL_ASIGNAR', 'TIEMPOREAL_LIBERAR')
  async obtenerEstadoSala(@Param('id', ParseIntPipe) idSala: number) {
    return this.ocupacionService.obtenerEstadoSala(idSala);
  }

  @Get('salas/:id/sugerir-equipo')
  @Permisos('TIEMPOREAL_ASIGNAR')
  async sugerirEquipo(@Param('id', ParseIntPipe) idSala: number) {
    const pc = await this.ocupacionService.sugerirEquipoBalanceado(idSala);
    return { equipo: pc };
  }

  @Post('asignar')
  @Permisos('TIEMPOREAL_ASIGNAR')
  async asignarEquipo(
    @Body() dto: AsignarEquipoDto,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const idUsuario = req.user?.id_usuario || req.user?.id || 1;
    return this.ocupacionService.asignarEquipo(dto, idUsuario, ip);
  }

  @Post('liberar')
  @Permisos('TIEMPOREAL_LIBERAR')
  async liberarEquipo(
    @Body() dto: LiberarEquipoDto,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const idUsuario = req.user?.id_usuario || req.user?.id || 1;
    return this.ocupacionService.liberarEquipo(dto, idUsuario, ip);
  }

  @Post('salas/:id/liberar-por-catedra')
  @Permisos(
    'TIEMPOREAL_LIBERAR',
    'TIEMPOREAL_ASIGNAR',
    'RESERVAS_SOLICITAR',
    'RESERVAS_GESTIONAR',
  )
  @ApiOperation({
    summary:
      'CU14: Liberación en lote de todas las sesiones libres activas de una sala por inicio de cátedra docente',
  })
  async liberarSalaPorCatedra(
    @Param('id', ParseIntPipe) id: number,
    @Body('motivo') motivo: string,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const idUsuario = req.user?.id_usuario || req.user?.id || 1;
    return this.ocupacionService.liberarSalaCompletaPorCatedra(
      id,
      idUsuario,
      motivo,
      ip,
    );
  }

  @Post('salas/:id/finalizar-catedra')
  @Permisos(
    'TIEMPOREAL_LIBERAR',
    'TIEMPOREAL_ASIGNAR',
    'RESERVAS_SOLICITAR',
    'RESERVAS_GESTIONAR',
  )
  @ApiOperation({
    summary:
      'CU14/CU16: Finalizar cátedra docente en sala, conmutar reserva a FINALIZADA y restaurar computadoras a DISPONIBLE',
  })
  async finalizarCatedra(
    @Param('id', ParseIntPipe) id: number,
    @Body('motivo') motivo: string,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const idUsuario = req.user?.id_usuario || req.user?.id || 1;
    return this.ocupacionService.finalizarCatedra(id, idUsuario, motivo, ip);
  }

  @Get('estudiantes/buscar')
  @Permisos('TIEMPOREAL_ASIGNAR')
  async buscarEstudiantes(@Query('termino') termino: string) {
    return this.estudiantesService.autocompletar(termino);
  }

  @Get('estudiantes/:registro')
  @Permisos('TIEMPOREAL_ASIGNAR')
  async buscarPorRegistro(@Param('registro') registro: string) {
    return this.estudiantesService.buscarPorRegistro(registro);
  }

  @Post('estudiantes')
  @Permisos('TIEMPOREAL_ASIGNAR')
  async registrarEstudiante(
    @Body() dto: RegistrarEstudianteDto,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const idUsuario = req.user?.id_usuario || req.user?.id || 1;
    return this.estudiantesService.registrarEstudiante(dto, idUsuario, ip);
  }

  @Get('salas/:id/cola')
  @Permisos('TIEMPOREAL_MONITOREAR', 'TIEMPOREAL_ASIGNAR')
  async obtenerColaSala(@Param('id', ParseIntPipe) idSala: number) {
    return this.colasEsperaService.obtenerColaSala(idSala);
  }

  @Post('cola')
  @Permisos('TIEMPOREAL_ASIGNAR')
  async encolarEstudiante(
    @Body() dto: EncolarEstudianteDto,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const idUsuario = req.user?.id_usuario || req.user?.id || 1;
    return this.colasEsperaService.encolarEstudiante(dto, idUsuario, ip);
  }

  @Delete('cola/:id')
  @Permisos('TIEMPOREAL_ASIGNAR')
  async cancelarTurnoCola(
    @Param('id', ParseIntPipe) idCola: number,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const idUsuario = req.user?.id_usuario || req.user?.id || 1;
    return this.colasEsperaService.cancelarTurno(idCola, idUsuario, ip);
  }
}
