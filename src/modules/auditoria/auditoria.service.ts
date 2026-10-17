import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BitacoraAuditoria } from './entities/bitacora-auditoria.entity';

export interface RegistrarAuditoriaDto {
  id_usuario?: number | null;
  correo_usuario?: string | null;
  accion: string;
  tabla_afectada: string;
  id_registro_afectado: string;
  valores_anteriores?: Record<string, any> | null;
  valores_nuevos?: Record<string, any> | null;
  ip_cliente?: string | null;
}

@Injectable()
export class AuditoriaService {
  constructor(
    @InjectRepository(BitacoraAuditoria)
    private readonly auditRepo: Repository<BitacoraAuditoria>,
  ) {}

  async registrar(dto: RegistrarAuditoriaDto): Promise<BitacoraAuditoria> {
    const registro = this.auditRepo.create({
      id_usuario: dto.id_usuario ?? null,
      correo_usuario: dto.correo_usuario ?? null,
      accion: dto.accion,
      tabla_afectada: dto.tabla_afectada,
      id_registro_afectado: String(dto.id_registro_afectado),
      valores_anteriores: dto.valores_anteriores ?? null,
      valores_nuevos: dto.valores_nuevos ?? null,
      ip_cliente: dto.ip_cliente ?? null,
    });
    return this.auditRepo.save(registro);
  }

  async findAll(params?: {
    tabla?: string;
    accion?: string;
    correo?: string;
    limite?: number;
    pagina?: number;
    ordenColumna?: string;
    ordenDireccion?: 'ASC' | 'DESC';
  }) {
    const limite = params?.limite || 15;
    const pagina = params?.pagina || 1;
    const skip = (pagina - 1) * limite;

    const columna =
      params?.ordenColumna === 'id_auditoria'
        ? 'a.id_auditoria'
        : 'a.fecha_hora';
    const direccion: 'ASC' | 'DESC' =
      params?.ordenDireccion?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const qb = this.auditRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.usuario', 'u')
      .orderBy(columna, direccion)
      .take(limite)
      .skip(skip);

    if (params?.tabla) {
      qb.andWhere('a.tabla_afectada = :tabla', { tabla: params.tabla });
    }
    if (params?.accion) {
      qb.andWhere('a.accion = :accion', { accion: params.accion });
    }
    if (params?.correo) {
      qb.andWhere('a.correo_usuario ILIKE :correo', {
        correo: `%${params.correo}%`,
      });
    }

    const [items, total] = await qb.getManyAndCount();
    const sanitizedItems = items.map((i) => {
      if (i.usuario) {
        const { password_hash, ...uRest } = i.usuario;
        i.usuario = uRest as any;
      }
      return i;
    });

    return {
      total,
      pagina,
      limite,
      paginas_totales: Math.ceil(total / limite),
      items: sanitizedItems,
    };
  }
}
