import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LaboratorioSala } from './entities/laboratorio-sala.entity';
import { Computadora } from './entities/computadora.entity';
import { TipoPeriferico } from './entities/tipo-periferico.entity';
import { PerifericoInventario } from './entities/periferico-inventario.entity';
import { SalasService } from './services/salas.service';
import { ComputadorasService } from './services/computadoras.service';
import { PerifericosService } from './services/perifericos.service';
import { SalasController } from './controllers/salas.controller';
import { ComputadorasController } from './controllers/computadoras.controller';
import { PerifericosController } from './controllers/perifericos.controller';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LaboratorioSala,
      Computadora,
      TipoPeriferico,
      PerifericoInventario,
    ]),
    AuditoriaModule,
  ],
  controllers: [
    SalasController,
    ComputadorasController,
    PerifericosController,
  ],
  providers: [
    SalasService,
    ComputadorasService,
    PerifericosService,
  ],
  exports: [
    SalasService,
    ComputadorasService,
    PerifericosService,
  ],
})
export class InfraestructuraModule {}
