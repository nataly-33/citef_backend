import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Rol } from './entities/rol.entity';
import { Permiso } from './entities/permiso.entity';
import { CrearRolDto } from './dto/crear-rol.dto';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Rol)
    private readonly rolRepo: Repository<Rol>,
    @InjectRepository(Permiso)
    private readonly permisoRepo: Repository<Permiso>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async findAll(): Promise<Rol[]> {
    return this.rolRepo.find({
      relations: { permisos: true },
      order: { id_rol: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Rol> {
    const rol = await this.rolRepo.findOne({
      where: { id_rol: id },
      relations: { permisos: true },
    });
    if (!rol) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }
    return rol;
  }

  async findAllPermisos(): Promise<Permiso[]> {
    return this.permisoRepo.find({
      order: { modulo: 'ASC', codigo: 'ASC' },
    });
  }

  async crear(
    dto: CrearRolDto,
    usuarioEjecutor?: { id_usuario: number; correo: string },
    ipCliente?: string,
  ): Promise<Rol> {
    const existe = await this.rolRepo.findOne({
      where: { nombre: dto.nombre.trim().toUpperCase() },
    });
    if (existe) {
      throw new ConflictException(`El rol '${dto.nombre}' ya existe en el sistema`);
    }

    let permisos: Permiso[] = [];
    if (dto.permisos_ids && dto.permisos_ids.length > 0) {
      permisos = await this.permisoRepo.findBy({
        id_permiso: In(dto.permisos_ids),
      });
    }

    const nuevoRol = this.rolRepo.create({
      nombre: dto.nombre.trim().toUpperCase(),
      descrip: dto.descrip.trim(),
      activo: true,
      permisos,
    });

    const guardado = await this.rolRepo.save(nuevoRol);

    await this.auditoriaService.registrar({
      id_usuario: usuarioEjecutor?.id_usuario,
      correo_usuario: usuarioEjecutor?.correo,
      accion: 'INSERT',
      tabla_afectada: 'rol',
      id_registro_afectado: String(guardado.id_rol),
      valores_nuevos: {
        nombre: guardado.nombre,
        descrip: guardado.descrip,
        permisos: guardado.permisos.map((p) => p.codigo),
      },
      ip_cliente: ipCliente,
    });

    return guardado;
  }

  async actualizarPermisos(
    idRol: number,
    permisosIds: number[],
    usuarioEjecutor?: { id_usuario: number; correo: string },
    ipCliente?: string,
  ): Promise<Rol> {
    const rol = await this.findOne(idRol);
    const permisosAnteriores = (rol.permisos || []).map((p) => p.codigo);

    const nuevosPermisos = await this.permisoRepo.findBy({
      id_permiso: In(permisosIds),
    });

    rol.permisos = nuevosPermisos;
    const actualizado = await this.rolRepo.save(rol);

    await this.auditoriaService.registrar({
      id_usuario: usuarioEjecutor?.id_usuario,
      correo_usuario: usuarioEjecutor?.correo,
      accion: 'UPDATE_PERMISOS',
      tabla_afectada: 'rol_permiso',
      id_registro_afectado: String(idRol),
      valores_anteriores: { permisos: permisosAnteriores },
      valores_nuevos: { permisos: nuevosPermisos.map((p) => p.codigo) },
      ip_cliente: ipCliente,
    });

    return actualizado;
  }
}
