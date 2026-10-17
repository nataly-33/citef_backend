import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like, ILike } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Usuario } from './entities/usuario.entity';
import { Rol } from './entities/rol.entity';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { CambiarPasswordDto } from './dto/cambiar-password.dto';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Rol)
    private readonly rolRepo: Repository<Rol>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async findAll(params?: { activo?: boolean; busqueda?: string }) {
    const qb = this.usuarioRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.roles', 'r')
      .leftJoinAndSelect('r.permisos', 'p')
      .orderBy('u.creado_en', 'DESC');

    if (params?.activo !== undefined) {
      qb.andWhere('u.activo = :activo', { activo: params.activo });
    }

    if (params?.busqueda) {
      qb.andWhere(
        '(u.correo_institucional ILIKE :q OR u.nombres ILIKE :q OR u.apellidos ILIKE :q)',
        { q: `%${params.busqueda}%` },
      );
    }

    const usuarios = await qb.getMany();
    // Excluir password_hash por seguridad
    return usuarios.map((u) => {
      const { password_hash, ...resto } = u;
      return resto;
    });
  }

  async findOne(id: number) {
    const usuario = await this.usuarioRepo.findOne({
      where: { id_usuario: id },
      relations: { roles: { permisos: true } },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    const { password_hash, ...resto } = usuario;
    return resto;
  }

  async crear(
    dto: CrearUsuarioDto,
    ejecutor?: { id_usuario: number; correo: string },
    ipCliente?: string,
  ) {
    const correo = dto.correo_institucional.trim().toLowerCase();
    const existe = await this.usuarioRepo.findOne({
      where: { correo_institucional: correo },
    });

    if (existe) {
      throw new ConflictException(
        `Ya existe un usuario con el correo institucional ${correo}`,
      );
    }

    const roles = await this.rolRepo.findBy({
      id_rol: In(dto.roles_ids),
    });

    if (roles.length === 0) {
      throw new BadRequestException(
        'Debe asociar al menos un rol válido al usuario',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const nuevoUsuario = this.usuarioRepo.create({
      correo_institucional: correo,
      password_hash: passwordHash,
      nombres: dto.nombres.trim(),
      apellidos: dto.apellidos.trim(),
      telefono: dto.telefono ? dto.telefono.trim() : undefined,
      activo: true,
      roles,
    });

    const guardado = await this.usuarioRepo.save(nuevoUsuario);

    // Auditoría
    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo,
      accion: 'INSERT',
      tabla_afectada: 'usuario',
      id_registro_afectado: String(guardado.id_usuario),
      valores_nuevos: {
        correo_institucional: guardado.correo_institucional,
        nombres: guardado.nombres,
        apellidos: guardado.apellidos,
        roles: guardado.roles.map((r) => r.nombre),
      },
      ip_cliente: ipCliente,
    });

    const { password_hash, ...resto } = guardado;
    return resto;
  }

  async actualizar(
    id: number,
    dto: ActualizarUsuarioDto,
    ejecutor?: { id_usuario: number; correo: string },
    ipCliente?: string,
  ) {
    const usuario = await this.usuarioRepo.findOne({
      where: { id_usuario: id },
      relations: { roles: true },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    const valoresAnteriores = {
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      telefono: usuario.telefono,
      activo: usuario.activo,
      roles: (usuario.roles || []).map((r) => r.nombre),
    };

    if (dto.nombres !== undefined) usuario.nombres = dto.nombres.trim();
    if (dto.apellidos !== undefined) usuario.apellidos = dto.apellidos.trim();
    if (dto.telefono !== undefined) usuario.telefono = dto.telefono.trim();
    if (dto.activo !== undefined) usuario.activo = dto.activo;

    if (dto.roles_ids && dto.roles_ids.length > 0) {
      const roles = await this.rolRepo.findBy({
        id_rol: In(dto.roles_ids),
      });
      usuario.roles = roles;
    }

    const actualizado = await this.usuarioRepo.save(usuario);

    // Auditoría
    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo,
      accion: 'UPDATE',
      tabla_afectada: 'usuario',
      id_registro_afectado: String(id),
      valores_anteriores: valoresAnteriores,
      valores_nuevos: {
        nombres: actualizado.nombres,
        apellidos: actualizado.apellidos,
        telefono: actualizado.telefono,
        activo: actualizado.activo,
        roles: (actualizado.roles || []).map((r) => r.nombre),
      },
      ip_cliente: ipCliente,
    });

    const { password_hash, ...resto } = actualizado;
    return resto;
  }

  async cambiarEstado(
    id: number,
    activo: boolean,
    ejecutor?: { id_usuario: number; correo: string },
    ipCliente?: string,
  ) {
    const usuario = await this.usuarioRepo.findOne({
      where: { id_usuario: id },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    const estadoAnterior = usuario.activo;
    usuario.activo = activo;
    await this.usuarioRepo.save(usuario);

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo,
      accion: 'CAMBIO_ESTADO',
      tabla_afectada: 'usuario',
      id_registro_afectado: String(id),
      valores_anteriores: { activo: estadoAnterior },
      valores_nuevos: { activo },
      ip_cliente: ipCliente,
    });

    return {
      mensaje: `Usuario ${activo ? 'activado' : 'desactivado'} correctamente`,
      id_usuario: id,
      activo,
    };
  }

  async cambiarPassword(
    id: number,
    dto: CambiarPasswordDto,
    ejecutor?: { id_usuario: number; correo: string },
    ipCliente?: string,
  ) {
    const usuario = await this.usuarioRepo.findOne({
      where: { id_usuario: id },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    const nuevoHash = await bcrypt.hash(dto.nueva_password, 10);
    usuario.password_hash = nuevoHash;
    await this.usuarioRepo.save(usuario);

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo,
      accion: 'ADMIN_CAMBIO_PASSWORD',
      tabla_afectada: 'usuario',
      id_registro_afectado: String(id),
      valores_nuevos: { password_modificado: true },
      ip_cliente: ipCliente,
    });

    return {
      mensaje: 'Contraseña actualizada correctamente por el administrador',
    };
  }
}
