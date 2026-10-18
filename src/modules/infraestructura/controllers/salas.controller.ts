import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { SalasService } from '../services/salas.service';
import { ComputadorasService } from '../services/computadoras.service';
import { CrearSalaDto } from '../dto/crear-sala.dto';
import { ActualizarSalaDto } from '../dto/actualizar-sala.dto';
import { GuardarPosicionesComputadorasDto } from '../dto/guardar-posiciones-computadoras.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Permisos } from '../../auth/decorators/permisos.decorator';

@Controller('salas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalasController {
  constructor(
    private readonly salasService: SalasService,
    private readonly computadorasService: ComputadorasService,
  ) {}

  @Get()
  @Permisos('INFRA_LABS_GESTIONAR', 'INFRA_SALAS_CONFIGURAR', 'INFRA_INVENTARIO_GESTIONAR')
  findAll(
    @Query('busqueda') busqueda?: string,
    @Query('piso') piso?: string,
    @Query('estado_operativo') estado_operativo?: string,
    @Query('activo') activo?: string,
  ) {
    return this.salasService.findAll({
      busqueda,
      piso: piso !== undefined && piso !== '' ? parseInt(piso, 10) : undefined,
      estado_operativo,
      activo: activo !== undefined && activo !== '' ? activo === 'true' : undefined,
    });
  }

  @Get(':id')
  @Permisos('INFRA_LABS_GESTIONAR', 'INFRA_SALAS_CONFIGURAR', 'INFRA_INVENTARIO_GESTIONAR')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.salasService.findOne(id);
  }

  @Post()
  @Permisos('INFRA_LABS_GESTIONAR')
  crear(@Body() dto: CrearSalaDto, @Req() req: any) {
    return this.salasService.crear(dto, req.user, req.ip);
  }

  @Put(':id')
  @Permisos('INFRA_LABS_GESTIONAR')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarSalaDto,
    @Req() req: any,
  ) {
    return this.salasService.actualizar(id, dto, req.user, req.ip);
  }

  @Delete(':id')
  @Permisos('INFRA_LABS_GESTIONAR')
  eliminar(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.salasService.eliminar(id, req.user, req.ip);
  }

  @Get(':id/computadoras')
  @Permisos('INFRA_LABS_GESTIONAR', 'INFRA_SALAS_CONFIGURAR', 'INFRA_INVENTARIO_GESTIONAR')
  getComputadoras(@Param('id', ParseIntPipe) id: number) {
    return this.computadorasService.findBySala(id);
  }

  @Put(':id/posiciones')
  @Permisos('INFRA_SALAS_CONFIGURAR')
  guardarPosiciones(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GuardarPosicionesComputadorasDto,
    @Req() req: any,
  ) {
    return this.computadorasService.guardarPosicionesMasivas(id, dto, req.user, req.ip);
  }
}
