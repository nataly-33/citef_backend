import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JornadaTurno } from './entities/jornada-turno.entity';
import { ActaRelevo } from './entities/acta-relevo.entity';
import { AveriaEquipo } from './entities/averia-equipo.entity';
import { ObjetoExtraviado } from './entities/objeto-extraviado.entity';
import { LaboratorioSala } from '../infraestructura/entities/laboratorio-sala.entity';
import { Computadora } from '../infraestructura/entities/computadora.entity';
import { AsignacionSesion } from '../ocupacion/entities/asignacion-sesion.entity';
import { Estudiante } from '../ocupacion/entities/estudiante.entity';
import { ReservaSala } from '../reservas/entities/reserva-sala.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { AsignarTurno } from '../catalogos/entities/asignar-turno.entity';
import { MantenimientoTaller } from '../soporte/entities/mantenimiento-taller.entity';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { TurnosService } from './services/turnos.service';
import { AveriasService } from './services/averias.service';
import { ObjetosExtraviadosService } from './services/objetos-extraviados.service';
import { TurnosController } from './controllers/turnos.controller';
import { AveriasController } from './controllers/averias.controller';
import { ObjetosExtraviadosController } from './controllers/objetos-extraviados.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      JornadaTurno,
      ActaRelevo,
      AveriaEquipo,
      ObjetoExtraviado,
      LaboratorioSala,
      Computadora,
      AsignacionSesion,
      Estudiante,
      ReservaSala,
      Usuario,
      AsignarTurno,
      MantenimientoTaller,
    ]),
    AuditoriaModule,
  ],
  controllers: [
    TurnosController,
    AveriasController,
    ObjetosExtraviadosController,
  ],
  providers: [TurnosService, AveriasService, ObjetosExtraviadosService],
  exports: [TurnosService, AveriasService, ObjetosExtraviadosService],
})
export class TurnosModule {}
