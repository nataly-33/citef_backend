import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { ComputadorasService } from '../services/computadoras.service';
import { CrearComputadoraDto } from '../dto/crear-computadora.dto';
import { ActualizarComputadoraDto } from '../dto/actualizar-computadora.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Permisos } from '../../auth/decorators/permisos.decorator';

@Controller('computadoras')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComputadorasController {
  constructor(private readonly computadorasService: ComputadorasService) {}

  @Get(':id')
  @Permisos(
    'INFRA_LABS_GESTIONAR',
    'INFRA_SALAS_CONFIGURAR',
    'INFRA_INVENTARIO_GESTIONAR',
  )
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.computadorasService.findOne(id);
  }

  @Post()
  @Permisos('INFRA_LABS_GESTIONAR', 'INFRA_SALAS_CONFIGURAR')
  crear(@Body() dto: CrearComputadoraDto, @Req() req: any) {
    return this.computadorasService.crear(dto, req.user, req.ip);
  }

  @Put(':id')
  @Permisos('INFRA_LABS_GESTIONAR', 'INFRA_SALAS_CONFIGURAR')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarComputadoraDto,
    @Req() req: any,
  ) {
    return this.computadorasService.actualizar(id, dto, req.user, req.ip);
  }

  @Delete(':id')
  @Permisos('INFRA_LABS_GESTIONAR', 'INFRA_SALAS_CONFIGURAR')
  eliminar(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.computadorasService.eliminar(id, req.user, req.ip);
  }
}
