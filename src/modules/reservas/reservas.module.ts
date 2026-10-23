import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservaSala } from './entities/reserva-sala.entity';
import { Docente } from '../catalogos/entities/docente.entity';
import { Materia } from '../catalogos/entities/materia.entity';
import { LaboratorioSala } from '../infraestructura/entities/laboratorio-sala.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { ReservasService } from './services/reservas.service';
import { AlgoritmoDisponibilidadService } from './services/algoritmo-disponibilidad.service';
import { ReservasGateway } from './gateways/reservas.gateway';
import { ReservasController } from './controllers/reservas.controller';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReservaSala,
      Docente,
      Materia,
      LaboratorioSala,
      Usuario,
    ]),
    AuditoriaModule,
  ],
  controllers: [ReservasController],
  providers: [ReservasService, AlgoritmoDisponibilidadService, ReservasGateway],
  exports: [ReservasService, AlgoritmoDisponibilidadService, ReservasGateway],
})
export class ReservasModule {}
