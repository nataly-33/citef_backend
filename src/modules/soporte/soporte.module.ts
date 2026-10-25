import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MantenimientoTaller } from './entities/mantenimiento-taller.entity';
import { ConfirmacionRetornoSala } from './entities/confirmacion-retorno.entity';
import { IndicadorConfiabilidadRAMS } from './entities/indicador-rams.entity';
import { Computadora } from '../infraestructura/entities/computadora.entity';
import { LaboratorioSala } from '../infraestructura/entities/laboratorio-sala.entity';
import { AveriaEquipo } from '../turnos/entities/averia-equipo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { OcupacionModule } from '../ocupacion/ocupacion.module';
import { MetricasRamsService } from './services/metricas-rams.service';
import { SoporteService } from './services/soporte.service';
import { SoporteController } from './controllers/soporte.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MantenimientoTaller,
      ConfirmacionRetornoSala,
      IndicadorConfiabilidadRAMS,
      Computadora,
      LaboratorioSala,
      AveriaEquipo,
      Usuario,
    ]),
    AuditoriaModule,
    OcupacionModule,
  ],
  controllers: [SoporteController],
  providers: [MetricasRamsService, SoporteService],
  exports: [MetricasRamsService, SoporteService],
})
export class SoporteModule {}
