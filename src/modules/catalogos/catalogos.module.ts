import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Carrera } from './entities/carrera.entity';
import { Materia } from './entities/materia.entity';
import { Docente } from './entities/docente.entity';
import { MotivoUso } from './entities/motivo-uso.entity';
import { HorarioOperativo } from './entities/horario-operativo.entity';
import { AsignarTurno } from './entities/asignar-turno.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Rol } from '../usuarios/entities/rol.entity';
import { AuditoriaModule } from '../auditoria/auditoria.module';

import { CarrerasService } from './services/carreras.service';
import { MateriasService } from './services/materias.service';
import { MotivosService } from './services/motivos.service';
import { HorariosService } from './services/horarios.service';
import { DocentesService } from './services/docentes.service';
import { TurnosAuxiliaresService } from './services/turnos-auxiliares.service';

import { AcademicosController } from './controllers/academicos.controller';
import { OperativosController } from './controllers/operativos.controller';
import { DocentesController } from './controllers/docentes.controller';
import {
  TurnosAuxiliaresController,
  AuxiliaresDisponiblesController,
} from './controllers/turnos-auxiliares.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Carrera,
      Materia,
      Docente,
      MotivoUso,
      HorarioOperativo,
      AsignarTurno,
      Usuario,
      Rol,
    ]),
    AuditoriaModule,
  ],
  controllers: [
    AcademicosController,
    OperativosController,
    DocentesController,
    TurnosAuxiliaresController,
    AuxiliaresDisponiblesController,
  ],
  providers: [
    CarrerasService,
    MateriasService,
    MotivosService,
    HorariosService,
    DocentesService,
    TurnosAuxiliaresService,
  ],
  exports: [
    CarrerasService,
    MateriasService,
    MotivosService,
    HorariosService,
    DocentesService,
    TurnosAuxiliaresService,
    TypeOrmModule,
  ],
})
export class CatalogosModule {}
