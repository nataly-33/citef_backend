import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AsignacionSesion } from '../entities/asignacion-sesion.entity';
import { ConsultarAsistenciasFiltroDto } from '../dto/consultar-asistencias-filtro.dto';

@Injectable()
export class AsistenciasService {
  private readonly logger = new Logger(AsistenciasService.name);

  constructor(
    @InjectRepository(AsignacionSesion)
    private readonly sesionRepo: Repository<AsignacionSesion>,
  ) {}

  async consultarAsistencias(filtro: ConsultarAsistenciasFiltroDto) {
    const page = filtro.page && filtro.page > 0 ? Number(filtro.page) : 1;
    const limit = filtro.limit && filtro.limit > 0 ? Number(filtro.limit) : 15;
    const skip = (page - 1) * limit;

    const qb = this.sesionRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.computadora', 'c')
      .leftJoinAndSelect('c.sala', 'sala')
      .leftJoinAndSelect('s.estudiante', 'e')
      .leftJoinAndSelect('e.carrera', 'carr')
      .leftJoinAndSelect('s.motivo', 'm')
      .leftJoinAndSelect('s.auxiliar', 'aux');

    if (filtro.id_sala) {
      qb.andWhere('c.id_sala = :idSala', { idSala: filtro.id_sala });
    }

    if (filtro.id_carrera) {
      qb.andWhere('e.id_carrera = :idCarrera', { idCarrera: filtro.id_carrera });
    }

    if (filtro.id_motivo) {
      qb.andWhere('s.id_motivo = :idMotivo', { idMotivo: filtro.id_motivo });
    }

    if (filtro.estado) {
      qb.andWhere('s.estado = :estado', { estado: filtro.estado });
    }

    if (filtro.fecha_inicio) {
      qb.andWhere('s.fecha_hora_inicio >= :fechaInicio', {
        fechaInicio: new Date(`${filtro.fecha_inicio}T00:00:00`),
      });
    }

    if (filtro.fecha_fin) {
      qb.andWhere('s.fecha_hora_inicio <= :fechaFin', {
        fechaFin: new Date(`${filtro.fecha_fin}T23:59:59`),
      });
    }

    if (filtro.termino && filtro.termino.trim()) {
      const t = `%${filtro.termino.trim()}%`;
      qb.andWhere(
        '(e.registro ILIKE :t OR e.ci ILIKE :t OR e.nombres ILIKE :t OR e.apellidos ILIKE :t OR c.codigo_equipo ILIKE :t)',
        { t },
      );
    }

    qb.orderBy('s.fecha_hora_inicio', 'DESC');

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();

    const data = items.map((item) => ({
      id_asignacion: Number(item.id_asignacion),
      fecha_hora_inicio: item.fecha_hora_inicio,
      fecha_hora_fin: item.fecha_hora_fin,
      minutos_permanencia: item.minutos_permanencia,
      estado: item.estado,
      asignacion_automatica: item.asignacion_automatica,
      observaciones: item.observaciones,
      computadora: {
        id_computadora: Number(item.computadora?.id_computadora),
        codigo_equipo: item.computadora?.codigo_equipo,
      },
      sala: {
        id_sala: item.computadora?.sala?.id_sala,
        codigo_sala: item.computadora?.sala?.codigo_sala,
        nombre: item.computadora?.sala?.nombre,
      },
      estudiante: {
        registro: item.estudiante?.registro,
        ci: item.estudiante?.ci,
        nombre_completo: `${item.estudiante?.nombres || ''} ${item.estudiante?.apellidos || ''}`.trim(),
        carrera: item.estudiante?.carrera?.nombre || 'General',
      },
      motivo: item.motivo?.descrip || 'Práctica',
      auxiliar: item.auxiliar ? `${item.auxiliar.nombres} ${item.auxiliar.apellidos}`.trim() : 'Auxiliar',
    }));

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      data,
    };
  }

  async exportarAsistenciasCsv(filtro: ConsultarAsistenciasFiltroDto): Promise<string> {
    filtro.limit = 5000; // Límite amplio para exportación
    filtro.page = 1;
    const resultado = await this.consultarAsistencias(filtro);

    const headers = [
      'ID Sesion',
      'Fecha y Hora Inicio',
      'Fecha y Hora Fin',
      'Duracion (Minutos)',
      'Laboratorio',
      'Equipo',
      'Registro Universitario',
      'CI',
      'Estudiante',
      'Carrera',
      'Motivo de Uso',
      'Auxiliar Operador',
      'Estado',
      'Modo Asignacion',
    ];

    const rows = resultado.data.map((r) => [
      r.id_asignacion,
      r.fecha_hora_inicio ? new Date(r.fecha_hora_inicio).toISOString() : '',
      r.fecha_hora_fin ? new Date(r.fecha_hora_fin).toISOString() : '',
      r.minutos_permanencia || '',
      `"${r.sala.codigo_sala || ''}"`,
      `"${r.computadora.codigo_equipo || ''}"`,
      `"${r.estudiante.registro || ''}"`,
      `"${r.estudiante.ci || ''}"`,
      `"${r.estudiante.nombre_completo || ''}"`,
      `"${r.estudiante.carrera || ''}"`,
      `"${r.motivo || ''}"`,
      `"${r.auxiliar || ''}"`,
      r.estado,
      r.asignacion_automatica ? 'Automatica (Balanceada)' : 'Manual',
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    return csvContent;
  }
}
