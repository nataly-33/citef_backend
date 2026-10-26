import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuditoriaModule } from '../auditoria/auditoria.module';

// Entidades propias del Módulo 8
import { EjecucionMl } from './entities/ejecucion-ml.entity';
import { DocumentoReporteExportado } from './entities/documento-reporte-exportado.entity';

// Entidades relacionadas requeridas para métricas y reportes
import { LaboratorioSala } from '../infraestructura/entities/laboratorio-sala.entity';
import { Computadora } from '../infraestructura/entities/computadora.entity';
import { ReservaSala } from '../reservas/entities/reserva-sala.entity';
import { AsignacionSesion } from '../ocupacion/entities/asignacion-sesion.entity';
import { Carrera } from '../catalogos/entities/carrera.entity';
import { AveriaEquipo } from '../turnos/entities/averia-equipo.entity';
import { BitacoraAuditoria } from '../auditoria/entities/bitacora-auditoria.entity';

// Clientes y Servicios
import { AnalyticsFastApiClient } from './clients/analytics-fastapi.client';
import { MetricasDashboardService } from './services/metricas-dashboard.service';
import { ExportacionReportesService } from './services/exportacion-reportes.service';
import { AnaliticaPredictivaService } from './services/analitica-predictiva.service';

// Controladores
import { MetricasController } from './controllers/metricas.controller';
import { ReportesController } from './controllers/reportes.controller';
import { PrediccionesController } from './controllers/predicciones.controller';

@Module({
  imports: [
    ConfigModule,
    AuditoriaModule,
    TypeOrmModule.forFeature([
      EjecucionMl,
      DocumentoReporteExportado,
      LaboratorioSala,
      Computadora,
      ReservaSala,
      AsignacionSesion,
      Carrera,
      AveriaEquipo,
      BitacoraAuditoria,
    ]),
  ],
  controllers: [
    MetricasController,
    ReportesController,
    PrediccionesController,
  ],
  providers: [
    AnalyticsFastApiClient,
    MetricasDashboardService,
    ExportacionReportesService,
    AnaliticaPredictivaService,
  ],
  exports: [
    MetricasDashboardService,
    ExportacionReportesService,
    AnaliticaPredictivaService,
    AnalyticsFastApiClient,
  ],
})
export class AnaliticaModule {}
