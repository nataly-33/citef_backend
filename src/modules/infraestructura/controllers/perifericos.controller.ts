import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { PerifericosService } from '../services/perifericos.service';
import { RegistrarPerifericoDto } from '../dto/registrar-periferico.dto';
import { ActualizarPerifericoDto } from '../dto/actualizar-periferico.dto';
import { AsignarPerifericoDto } from '../dto/asignar-periferico.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Permisos } from '../../auth/decorators/permisos.decorator';

@Controller('perifericos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PerifericosController {
  constructor(private readonly perifericosService: PerifericosService) {}

  @Get('tipos')
  @Permisos('INFRA_INVENTARIO_GESTIONAR', 'INFRA_LABS_GESTIONAR')
  getTipos() {
    return this.perifericosService.getTipos();
  }

  @Post('tipos')
  @Permisos('INFRA_INVENTARIO_GESTIONAR')
  crearTipo(@Body('nombre') nombre: string) {
    return this.perifericosService.crearTipo(nombre);
  }

  @Get()
  @Permisos('INFRA_INVENTARIO_GESTIONAR', 'INFRA_LABS_GESTIONAR')
  findAll(
    @Query('busqueda') busqueda?: string,
    @Query('id_tipo_periferico') id_tipo_periferico?: string,
    @Query('id_sala') id_sala?: string,
    @Query('condicion_fisica') condicion_fisica?: string,
    @Query('id_computadora') id_computadora?: string,
    @Query('en_bodega') en_bodega?: string,
    @Query('activo') activo?: string,
    @Query('pagina') pagina?: string,
    @Query('limite') limite?: string,
  ) {
    return this.perifericosService.findAll({
      busqueda,
      id_tipo_periferico: id_tipo_periferico
        ? parseInt(id_tipo_periferico, 10)
        : undefined,
      id_sala: id_sala ? parseInt(id_sala, 10) : undefined,
      condicion_fisica,
      id_computadora: id_computadora ? parseInt(id_computadora, 10) : undefined,
      en_bodega: en_bodega === 'true',
      activo:
        activo !== undefined && activo !== '' ? activo === 'true' : undefined,
      pagina: pagina ? parseInt(pagina, 10) : 1,
      limite: limite ? parseInt(limite, 10) : 15,
    });
  }

  @Get(':id')
  @Permisos('INFRA_INVENTARIO_GESTIONAR')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.perifericosService.findOne(id);
  }

  @Post()
  @Permisos('INFRA_INVENTARIO_GESTIONAR')
  registrar(@Body() dto: RegistrarPerifericoDto, @Req() req: any) {
    return this.perifericosService.registrar(dto, req.user, req.ip);
  }

  @Put(':id')
  @Permisos('INFRA_INVENTARIO_GESTIONAR')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarPerifericoDto,
    @Req() req: any,
  ) {
    return this.perifericosService.actualizar(id, dto, req.user, req.ip);
  }

  @Patch(':id/asignar')
  @Permisos('INFRA_INVENTARIO_GESTIONAR')
  asignar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AsignarPerifericoDto,
    @Req() req: any,
  ) {
    return this.perifericosService.asignar(id, dto, req.user, req.ip);
  }

  @Delete(':id')
  @Permisos('INFRA_INVENTARIO_GESTIONAR')
  eliminar(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.perifericosService.eliminar(id, req.user, req.ip);
  }
}
