import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Permisos } from '../../auth/decorators/permisos.decorator';
import { ExportacionReportesService } from '../services/exportacion-reportes.service';
import { GenerarReporteDto } from '../dto/generar-reporte.dto';

@ApiTags('CU27: Reportes Dinámicos y Exportación')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analitica/reportes')
export class ReportesController {
  constructor(
    private readonly reportesService: ExportacionReportesService,
  ) {}

  @Get('catalogo')
  @Permisos('REPORTES_DINAMICOS', 'generar_reportes_oficiales')
  @ApiOperation({
    summary:
      'CU27: Obtener catálogo oficial de los 5 reportes institucionales acreditables de la FCEE',
  })
  @ApiResponse({
    status: 200,
    description: 'Catálogo de reportes recuperado exitosamente',
  })
  getCatalogo() {
    return this.reportesService.getCatalogoReportes();
  }

  @Post('exportar/excel')
  @Permisos('REPORTES_DINAMICOS', 'generar_reportes_oficiales')
  @ApiOperation({
    summary:
      'CU27: Generar y descargar libro Excel estructurado (.xlsx) con membrete institucional y firma criptográfica SHA-256',
  })
  @ApiResponse({
    status: 200,
    description: 'Archivo binario Excel generado exitosamente',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
    },
  })
  async exportarExcel(
    @Body() dto: GenerarReporteDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const idUsuario = req.user?.id_usuario || req.user?.id || 1;
    const { buffer, filename, hash_sha256, total_registros } =
      await this.reportesService.generarReporteExcel(dto, idUsuario);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.setHeader('X-Hash-SHA256', hash_sha256);
    res.setHeader('X-Total-Registros', String(total_registros));

    return res.end(buffer);
  }

  @Post('exportar/pdf-data')
  @Permisos('REPORTES_DINAMICOS', 'generar_reportes_oficiales')
  @ApiOperation({
    summary:
      'CU27: Generar datos estructurados oficiales para renderizado de PDF institucional con membrete UAGRM',
  })
  @ApiResponse({
    status: 200,
    description: 'Carga de datos formal para el PDF generada exitosamente',
  })
  async exportarPdfData(
    @Body() dto: GenerarReporteDto,
    @Req() req: any,
  ) {
    const idUsuario = req.user?.id_usuario || req.user?.id || 1;
    return this.reportesService.generarDatosReportePdf(dto, idUsuario);
  }
}
