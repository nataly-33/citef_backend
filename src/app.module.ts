import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogosModule } from './modules/catalogos/catalogos.module';
import { InfraestructuraModule } from './modules/infraestructura/infraestructura.module';
import { OcupacionModule } from './modules/ocupacion/ocupacion.module';
import { ReservasModule } from './modules/reservas/reservas.module';
import { TurnosModule } from './modules/turnos/turnos.module';
import { SoporteModule } from './modules/soporte/soporte.module';
import { SeedModule } from './modules/seed/seed.module';
import { HttpLoggerMiddleware } from './common/middleware/http-logger.middleware';

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
        autoLoadEntities: true,
        synchronize: true, // Automático en desarrollo
        logging: ['error', 'warn'],
      }),
      inject: [ConfigService],
    }),
    AuditoriaModule,
    UsuariosModule,
    AuthModule,
    CatalogosModule,
    InfraestructuraModule,
    OcupacionModule,
    ReservasModule,
    TurnosModule,
    SoporteModule,
    SeedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggerMiddleware).forRoutes('*');
  }
}
