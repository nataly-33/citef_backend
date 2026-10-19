import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Rol } from '../usuarios/entities/rol.entity';
import { Permiso } from '../usuarios/entities/permiso.entity';
import { TokenRecuperacion } from '../usuarios/entities/token-recuperacion.entity';
import { Carrera } from '../catalogos/entities/carrera.entity';
import { Materia } from '../catalogos/entities/materia.entity';
import { CarreraMateria } from '../catalogos/entities/carrera-materia.entity';
import { HorarioOperativo } from '../catalogos/entities/horario-operativo.entity';
import { MotivoUso } from '../catalogos/entities/motivo-uso.entity';
import { Docente } from '../catalogos/entities/docente.entity';
import { AsignarTurno } from '../catalogos/entities/asignar-turno.entity';
import { LaboratorioSala } from '../infraestructura/entities/laboratorio-sala.entity';
import { Computadora } from '../infraestructura/entities/computadora.entity';
import { TipoPeriferico } from '../infraestructura/entities/tipo-periferico.entity';
import { PerifericoInventario } from '../infraestructura/entities/periferico-inventario.entity';
import { Estudiante } from '../ocupacion/entities/estudiante.entity';
import { AsignacionSesion } from '../ocupacion/entities/asignacion-sesion.entity';
import { ColaEsperaSala } from '../ocupacion/entities/cola-espera-sala.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Usuario,
      Rol,
      Permiso,
      TokenRecuperacion,
      Carrera,
      Materia,
      CarreraMateria,
      HorarioOperativo,
      MotivoUso,
      Docente,
      AsignarTurno,
      LaboratorioSala,
      Computadora,
      TipoPeriferico,
      PerifericoInventario,
      Estudiante,
      AsignacionSesion,
      ColaEsperaSala,
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
