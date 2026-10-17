import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from './entities/usuario.entity';
import { Rol } from './entities/rol.entity';
import { Permiso } from './entities/permiso.entity';
import { TokenRecuperacion } from './entities/token-recuperacion.entity';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario, Rol, Permiso, TokenRecuperacion]),
    AuditoriaModule,
  ],
  controllers: [UsuariosController, RolesController],
  providers: [UsuariosService, RolesService],
  exports: [UsuariosService, RolesService, TypeOrmModule],
})
export class UsuariosModule {}
