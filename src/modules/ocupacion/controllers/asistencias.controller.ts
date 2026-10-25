import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Permisos } from '../../auth/decorators/permisos.decorator';
import { AsistenciasService } from '../services/asistencias.service';
import { ConsultarAsistenciasFiltroDto } from '../dto/consultar-asistencias-filtro.dto';

@Controller('ocupacion/asistencias')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AsistenciasController {
  constructor(private readonly asistenciasService: AsistenciasService) {}

  @Get()
  @Permisos('TIEMPOREAL_ASISTENCIAS')
  async consultarAsistencias(@Query() query: ConsultarAsistenciasFiltroDto) {
    return this.asistenciasService.consultarAsistencias(query);
  }

  @Get('exportar')
  @Permisos('TIEMPOREAL_ASISTENCIAS')
  async exportarAsistenciasCsv(
    @Query() query: ConsultarAsistenciasFiltroDto,
    @Res() res: Response,
  ) {
    const csvData = await this.asistenciasService.exportarAsistenciasCsv(query);
    const filename = `asistencias_citef_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send('\uFEFF' + csvData); // UTF-8 BOM para apertura perfecta en Excel
  }
}
