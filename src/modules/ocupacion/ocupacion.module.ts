import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Estudiante } from './entities/estudiante.entity';
import { AsignacionSesion } from './entities/asignacion-sesion.entity';
import { ColaEsperaSala } from './entities/cola-espera-sala.entity';
import { MetricaColaHistorica } from './entities/metrica-cola-historica.entity';
import { LaboratorioSala } from '../infraestructura/entities/laboratorio-sala.entity';
import { Computadora } from '../infraestructura/entities/computadora.entity';
import { MotivoUso } from '../catalogos/entities/motivo-uso.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { AuditoriaModule } from '../auditoria/auditoria.module';

import { OcupacionGateway } from './gateways/ocupacion.gateway';
import { OcupacionService } from './services/ocupacion.service';
import { EstudiantesService } from './services/estudiantes.service';
import { ColasEsperaService } from './services/colas-espera.service';
import { AsistenciasService } from './services/asistencias.service';

import { OcupacionController } from './controllers/ocupacion.controller';
import { AsistenciasController } from './controllers/asistencias.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Estudiante,
      AsignacionSesion,
      ColaEsperaSala,
      MetricaColaHistorica,
      LaboratorioSala,
      Computadora,
      MotivoUso,
      Usuario,
    ]),
    AuditoriaModule,
  ],
  controllers: [OcupacionController, AsistenciasController],
  providers: [
    OcupacionGateway,
    OcupacionService,
    EstudiantesService,
    ColasEsperaService,
    AsistenciasService,
  ],
  exports: [
    OcupacionGateway,
    OcupacionService,
    EstudiantesService,
    ColasEsperaService,
    AsistenciasService,
  ],
})
export class OcupacionModule {}
