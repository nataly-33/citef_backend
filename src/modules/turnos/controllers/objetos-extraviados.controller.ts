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
import { ObjetosExtraviadosService } from '../services/objetos-extraviados.service';
import { RegistrarObjetoDto } from '../dto/registrar-objeto.dto';
import { DevolverObjetoDto } from '../dto/devolver-objeto.dto';
import { FiltroObjetosDto } from '../dto/filtro-objetos.dto';

@ApiTags('Objetos Extraviados y Custodia')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('turnos/objetos')
export class ObjetosExtraviadosController {
  constructor(private readonly objetosService: ObjetosExtraviadosService) {}

  @Post()
  @Permisos('TURNOS_OBJETOS_EXTRAVIADOS')
  @ApiOperation({
    summary:
      'CU23: Registrar pertenencia extraviada hallada en sala bajo estado de custodia',
  })
  async registrarObjeto(
    @Body() dto: RegistrarObjetoDto,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const idUsuario = req.user?.id_usuario || req.user?.id || 1;
    return this.objetosService.registrarObjeto(dto, idUsuario, ip);
  }

  @Get()
  @Permisos('TURNOS_OBJETOS_EXTRAVIADOS')
  @ApiOperation({
    summary:
      'CU23: Listar objetos extraviados con filtros de búsqueda y paginación',
  })
  async getObjetos(@Query() params: FiltroObjetosDto) {
    return this.objetosService.getObjetos(params);
  }

  @Get(':id')
  @Permisos('TURNOS_OBJETOS_EXTRAVIADOS')
  @ApiOperation({
    summary: 'CU23: Obtener detalle de un objeto extraviado por ID',
  })
  async getObjetoById(@Param('id', ParseIntPipe) id: number) {
    return this.objetosService.getObjetoById(id);
  }

  @Post(':id/devolver')
  @Permisos('TURNOS_OBJETOS_EXTRAVIADOS')
  @ApiOperation({
    summary:
      'CU23: Registrar restitución y entrega formal del objeto acreditando al alumno receptor (POST)',
  })
  async devolverObjetoPost(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DevolverObjetoDto,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const idUsuario = req.user?.id_usuario || req.user?.id || 1;
    return this.objetosService.devolverObjeto(id, dto, idUsuario, ip);
  }

  @Patch(':id/devolver')
  @Permisos('TURNOS_OBJETOS_EXTRAVIADOS')
  @ApiOperation({
    summary:
      'CU23: Registrar restitución y entrega formal del objeto acreditando al alumno receptor (PATCH)',
  })
  async devolverObjetoPatch(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DevolverObjetoDto,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const idUsuario = req.user?.id_usuario || req.user?.id || 1;
    return this.objetosService.devolverObjeto(id, dto, idUsuario, ip);
  }
}
