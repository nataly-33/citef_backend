import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Rol } from '../usuarios/entities/rol.entity';
import { Permiso } from '../usuarios/entities/permiso.entity';
import { TokenRecuperacion } from '../usuarios/entities/token-recuperacion.entity';
import { Carrera } from '../catalogos/entities/carrera.entity';
import { Materia } from '../catalogos/entities/materia.entity';
import { HorarioOperativo } from '../catalogos/entities/horario-operativo.entity';
import { MotivoUso } from '../catalogos/entities/motivo-uso.entity';
import { Docente } from '../catalogos/entities/docente.entity';
import { AsignarTurno } from '../catalogos/entities/asignar-turno.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Usuario,
      Rol,
      Permiso,
      TokenRecuperacion,
      Carrera,
      Materia,
      HorarioOperativo,
      MotivoUso,
      Docente,
      AsignarTurno,
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
