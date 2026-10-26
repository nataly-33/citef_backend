import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Permisos } from '../../auth/decorators/permisos.decorator';
import { MetricasDashboardService } from '../services/metricas-dashboard.service';
import { FiltroDashboardDto } from '../dto/filtro-dashboard.dto';

@ApiTags('CU27: Analítica y Dashboard Gerencial')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analitica/dashboard')
export class MetricasController {
  constructor(
    private readonly metricasService: MetricasDashboardService,
  ) {}

  @Get('kpis')
  @Permisos('REPORTES_DINAMICOS', 'ver_dashboard_analitica')
  @ApiOperation({
    summary:
      'CU27: Obtener los 6 KPIs ejecutivos en tiempo real (Tasa Ocupación, Horas Cátedra, Evaluaciones, Permanencia, RAMS, Mitigación)',
  })
  @ApiResponse({
    status: 200,
    description: 'KPIs ejecutivos calculados exitosamente',
  })
  async getKpis(@Query() params: FiltroDashboardDto) {
    return this.metricasService.getKpisEjecutivos(params);
  }

  @Get('graficos')
  @Permisos('REPORTES_DINAMICOS', 'ver_dashboard_analitica')
  @ApiOperation({
    summary:
      'CU27: Obtener batería de gráficos interactivos (Donut por Carrera, Barras por Sala y Día, Línea Demanda Horaria, Heatmap)',
  })
  @ApiResponse({
    status: 200,
    description: 'Datos de gráficos estadísticos generados exitosamente',
  })
  async getGraficos(@Query() params: FiltroDashboardDto) {
    return this.metricasService.getGraficosDashboard(params);
  }
}
