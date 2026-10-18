import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedModule } from '../modules/seed/seed.module';
import { SeedService } from '../modules/seed/seed.service';
import { Usuario } from '../modules/usuarios/entities/usuario.entity';
import { Rol } from '../modules/usuarios/entities/rol.entity';
import { Permiso } from '../modules/usuarios/entities/permiso.entity';
import { TokenRecuperacion } from '../modules/usuarios/entities/token-recuperacion.entity';
import { BitacoraAuditoria } from '../modules/auditoria/entities/bitacora-auditoria.entity';
import { Carrera } from '../modules/catalogos/entities/carrera.entity';
import { Materia } from '../modules/catalogos/entities/materia.entity';
import { HorarioOperativo } from '../modules/catalogos/entities/horario-operativo.entity';
import { MotivoUso } from '../modules/catalogos/entities/motivo-uso.entity';
import { Docente } from '../modules/catalogos/entities/docente.entity';
import { AsignarTurno } from '../modules/catalogos/entities/asignar-turno.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_NAME', 'citef_db'),
        entities: [
          Usuario,
          Rol,
          Permiso,
          TokenRecuperacion,
          BitacoraAuditoria,
          Carrera,
          Materia,
          HorarioOperativo,
          MotivoUso,
          Docente,
          AsignarTurno,
        ],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    SeedModule,
  ],
})
class StandaloneSeedModule {}

async function run() {
  console.log('--- INICIANDO SEEDER MANUAL DE CITEF ---');
  const app = await NestFactory.createApplicationContext(StandaloneSeedModule);
  const seedService = app.get(SeedService);
  await seedService.onApplicationBootstrap();
  await app.close();
  console.log('--- SEEDER EJECUTADO EXITOSAMENTE ---');
  process.exit(0);
}

run().catch((err) => {
  console.error('Error al ejecutar el seeder:', err);
  process.exit(1);
});
