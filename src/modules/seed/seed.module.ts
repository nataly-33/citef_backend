import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Rol } from '../usuarios/entities/rol.entity';
import { Permiso } from '../usuarios/entities/permiso.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, Rol, Permiso])],
  providers: [SeedService],
})
export class SeedModule {}
