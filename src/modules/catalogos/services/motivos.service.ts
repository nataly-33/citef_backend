import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MotivoUso } from '../entities/motivo-uso.entity';
import { CrearMotivoDto } from '../dto/crear-motivo.dto';
import { ActualizarMotivoDto } from '../dto/actualizar-motivo.dto';
import { AuditoriaService } from '../../auditoria/auditoria.service';

@Injectable()
export class MotivosService {
  private readonly logger = new Logger(MotivosService.name);

  constructor(
    @InjectRepository(MotivoUso)
    private readonly motivoRepo: Repository<MotivoUso>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async findAll(params?: {
    pagina?: number;
    limite?: number;
    tipo?: string;
    busqueda?: string;
    activo?: boolean;
    todos?: boolean;
  }) {
    if (params?.todos) {
      const qb = this.motivoRepo
        .createQueryBuilder('m')
        .orderBy('m.descrip', 'ASC');

      if (params.tipo) {
        qb.andWhere('m.tipo = :tipo', { tipo: params.tipo });
      }

      if (params.activo !== undefined) {
        qb.andWhere('m.activo = :activo', { activo: params.activo });
      }

      if (params.busqueda) {
        qb.andWhere('m.descrip ILIKE :q', { q: `%${params.busqueda}%` });
      }

      return qb.getMany();
    }

    const limite = params?.limite || 15;
    const pagina = params?.pagina || 1;
    const skip = (pagina - 1) * limite;

    const qb = this.motivoRepo
      .createQueryBuilder('m')
      .orderBy('m.descrip', 'ASC')
      .take(limite)
      .skip(skip);

    if (params?.tipo) {
      qb.andWhere('m.tipo = :tipo', { tipo: params.tipo });
    }

    if (params?.activo !== undefined) {
      qb.andWhere('m.activo = :activo', { activo: params.activo });
    }

    if (params?.busqueda) {
      qb.andWhere('m.descrip ILIKE :q', { q: `%${params.busqueda}%` });
    }

    const [items, total] = await qb.getManyAndCount();

    return {
      total,
      pagina,
      limite,
      paginas_totales: Math.ceil(total / limite),
      items,
    };
  }

  async findOne(id: number) {
    const motivo = await this.motivoRepo.findOne({
      where: { id_motivo: id },
    });

    if (!motivo) {
      throw new NotFoundException(`Motivo de uso con ID ${id} no encontrado`);
    }

    return motivo;
  }

  async crear(
    dto: CrearMotivoDto,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    const descrip = dto.descrip.trim();
    const tipo = dto.tipo.trim().toUpperCase();

    const existe = await this.motivoRepo.findOne({
      where: { descrip, tipo },
    });

    if (existe) {
      throw new ConflictException(
        `Ya existe un motivo de uso con la descripción "${descrip}" y tipo "${tipo}"`,
      );
    }

    const nuevo = this.motivoRepo.create({
      descrip,
      tipo,
      activo: dto.activo !== undefined ? dto.activo : true,
    });

    const guardado = await this.motivoRepo.save(nuevo);

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo,
      accion: 'INSERT',
      tabla_afectada: 'motivo_uso',
      id_registro_afectado: String(guardado.id_motivo),
      valores_nuevos: {
        descrip: guardado.descrip,
        tipo: guardado.tipo,
        activo: guardado.activo,
      },
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[MOTIVOS] Motivo creado: ID ${guardado.id_motivo} ("${guardado.descrip}" [${guardado.tipo}]) por ${ejecutor?.correo || 'Sistema'}`,
    );

    return guardado;
  }

  async actualizar(
    id: number,
    dto: ActualizarMotivoDto,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    const motivo = await this.findOne(id);

    const valoresAnteriores = {
      descrip: motivo.descrip,
      tipo: motivo.tipo,
      activo: motivo.activo,
    };

    if (dto.descrip !== undefined) motivo.descrip = dto.descrip.trim();
    if (dto.tipo !== undefined) motivo.tipo = dto.tipo.trim().toUpperCase();
    if (dto.activo !== undefined) motivo.activo = dto.activo;

    const duplicado = await this.motivoRepo.findOne({
      where: { descrip: motivo.descrip, tipo: motivo.tipo },
    });

    if (duplicado && duplicado.id_motivo !== id) {
      throw new ConflictException(
        `Ya existe otro motivo de uso con la descripción "${motivo.descrip}" y tipo "${motivo.tipo}"`,
      );
    }

    const actualizado = await this.motivoRepo.save(motivo);

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo,
      accion: 'UPDATE',
      tabla_afectada: 'motivo_uso',
      id_registro_afectado: String(actualizado.id_motivo),
      valores_anteriores: valoresAnteriores,
      valores_nuevos: {
        descrip: actualizado.descrip,
        tipo: actualizado.tipo,
        activo: actualizado.activo,
      },
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[MOTIVOS] Motivo actualizado: ID ${actualizado.id_motivo} por ${ejecutor?.correo || 'Sistema'}`,
    );

    return actualizado;
  }

  async cambiarEstado(
    id: number,
    activo: boolean,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    const motivo = await this.findOne(id);
    const estadoAnterior = motivo.activo;
    motivo.activo = activo;
    const guardado = await this.motivoRepo.save(motivo);

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo,
      accion: 'CAMBIO_ESTADO',
      tabla_afectada: 'motivo_uso',
      id_registro_afectado: String(guardado.id_motivo),
      valores_anteriores: { activo: estadoAnterior },
      valores_nuevos: { activo: guardado.activo },
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[MOTIVOS] Motivo ID ${guardado.id_motivo} estado modificado a ${activo ? 'ACTIVO' : 'INACTIVO'} por ${ejecutor?.correo || 'Sistema'}`,
    );

    return guardado;
  }

  async eliminar(
    id: number,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    return this.cambiarEstado(id, false, ejecutor, ipCliente);
  }
}
