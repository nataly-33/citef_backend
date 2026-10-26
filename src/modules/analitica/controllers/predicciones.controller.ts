import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Permisos } from '../../auth/decorators/permisos.decorator';
import { AnaliticaPredictivaService } from '../services/analitica-predictiva.service';
import { ConsultarPrediccionDto } from '../dto/consultar-prediccion.dto';
import { SimularColasDto } from '../dto/simular-colas.dto';

@ApiTags('CU26: Analítica Predictiva y Modelado de Colas')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analitica/predictivo')
export class PrediccionesController {
  constructor(
    private readonly predictivaService: AnaliticaPredictivaService,
  ) {}

  @Post('demanda')
  @Permisos('REPORTES_PREDICTIVOS', 'consultar_predicciones_ml')
  @ApiOperation({
    summary:
      'CU26: Predecir demanda horaria, curva de ocupación y riesgo de saturación mediante Machine Learning',
  })
  @ApiResponse({
    status: 200,
    description: 'Predicción de demanda computada exitosamente',
  })
  async predecirDemanda(
    @Body() dto: ConsultarPrediccionDto,
    @Req() req: any,
  ) {
    const idUsuario = req.user?.id_usuario || req.user?.id || 1;
    return this.predictivaService.predecirDemanda(dto, idUsuario);
  }

  @Post('colas-mmc')
  @Permisos('REPORTES_PREDICTIVOS', 'consultar_predicciones_ml')
  @ApiOperation({
    summary:
      'CU26: Simulación analítica de teoría de colas M/M/c (Erlang-C, Wq, Lq, factor rho y recomendaciones)',
  })
  @ApiResponse({
    status: 200,
    description: 'Simulación de colas calculada exitosamente',
  })
  async simularColas(
    @Body() dto: SimularColasDto,
    @Req() req: any,
  ) {
    const idUsuario = req.user?.id_usuario || req.user?.id || 1;
    return this.predictivaService.simularColas(dto, idUsuario);
  }

  @Get('health')
  @Permisos('REPORTES_PREDICTIVOS', 'consultar_predicciones_ml')
  @ApiOperation({
    summary:
      'Verificar estado de conectividad con el microservicio predictivo Python / FastAPI',
  })
  async checkHealth() {
    return this.predictivaService.checkFastApiHealth();
  }

  @Get('historial')
  @Permisos('REPORTES_PREDICTIVOS', 'consultar_predicciones_ml')
  @ApiOperation({
    summary: 'Consultar histórico de inferencias predictivas y simulaciones de colas',
  })
  @ApiQuery({ name: 'tipo', required: false, enum: ['PREDICCION_DEMANDA', 'SIMULACION_COLAS_MMC'] })
  @ApiQuery({ name: 'limite', required: false, type: Number })
  async getHistorial(
    @Query('tipo') tipo?: string,
    @Query('limite') limite?: number,
  ) {
    return this.predictivaService.getHistorialEjecuciones(
      tipo,
      limite ? Number(limite) : 15,
    );
  }
}
