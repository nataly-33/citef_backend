import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HorarioOperativo } from '../entities/horario-operativo.entity';
import { CrearHorarioDto } from '../dto/crear-horario.dto';
import { ActualizarHorarioDto } from '../dto/actualizar-horario.dto';
import { AuditoriaService } from '../../auditoria/auditoria.service';

@Injectable()
export class HorariosService {
  private readonly logger = new Logger(HorariosService.name);

  constructor(
    @InjectRepository(HorarioOperativo)
    private readonly horarioRepo: Repository<HorarioOperativo>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  private parseTimeToMinutes(t: string): number {
    const parts = t.split(':').map(Number);
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) {
      throw new BadRequestException(`Formato de hora inválido: ${t}`);
    }
    return parts[0] * 60 + parts[1];
  }

  private normalizeTime(t: string): string {
    const parts = t.split(':');
    const hh = parts[0].padStart(2, '0');
    const mm = parts[1].padStart(2, '0');
    const ss = parts[2] ? parts[2].padStart(2, '0') : '00';
    return `${hh}:${mm}:${ss}`;
  }

  async findAll(params?: {
    pagina?: number;
    limite?: number;
    turno?: string;
    activo?: boolean;
    todos?: boolean;
  }) {
    if (params?.todos) {
      const qb = this.horarioRepo
        .createQueryBuilder('h')
        .orderBy('h.hora_inicio', 'ASC');

      if (params.turno) {
        qb.andWhere('h.turno ILIKE :turno', { turno: `%${params.turno}%` });
      }

      if (params.activo !== undefined) {
        qb.andWhere('h.activo = :activo', { activo: params.activo });
      }

      return qb.getMany();
    }

    const limite = params?.limite || 15;
    const pagina = params?.pagina || 1;
    const skip = (pagina - 1) * limite;

    const qb = this.horarioRepo
      .createQueryBuilder('h')
      .orderBy('h.hora_inicio', 'ASC')
      .take(limite)
      .skip(skip);

    if (params?.turno) {
      qb.andWhere('h.turno ILIKE :turno', { turno: `%${params.turno}%` });
    }

    if (params?.activo !== undefined) {
      qb.andWhere('h.activo = :activo', { activo: params.activo });
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
    const horario = await this.horarioRepo.findOne({
      where: { id_horario: id },
    });

    if (!horario) {
      throw new NotFoundException(`Horario operativo con ID ${id} no encontrado`);
    }

    return horario;
  }

  async crear(
    dto: CrearHorarioDto,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    const horaInicioNorm = this.normalizeTime(dto.hora_inicio);
    const horaFinNorm = this.normalizeTime(dto.hora_fin);

    const minInicio = this.parseTimeToMinutes(horaInicioNorm);
    const minFin = this.parseTimeToMinutes(horaFinNorm);

    if (minInicio >= minFin) {
      throw new BadRequestException(
        'La hora de inicio debe ser estrictamente anterior a la hora de fin',
      );
    }

    const turno = dto.turno.trim().toUpperCase();

    const nuevo = this.horarioRepo.create({
      turno,
      hora_inicio: horaInicioNorm,
      hora_fin: horaFinNorm,
      activo: dto.activo !== undefined ? dto.activo : true,
    });

    const guardado = await this.horarioRepo.save(nuevo);

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo,
      accion: 'INSERT',
      tabla_afectada: 'horario_operativo',
      id_registro_afectado: String(guardado.id_horario),
      valores_nuevos: {
        turno: guardado.turno,
        hora_inicio: guardado.hora_inicio,
        hora_fin: guardado.hora_fin,
        activo: guardado.activo,
      },
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[HORARIOS] Horario creado: ID ${guardado.id_horario} (${guardado.turno}: ${guardado.hora_inicio} - ${guardado.hora_fin}) por ${ejecutor?.correo || 'Sistema'}`,
    );

    return guardado;
  }

  async actualizar(
    id: number,
    dto: ActualizarHorarioDto,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    const horario = await this.findOne(id);

    const valoresAnteriores = {
      turno: horario.turno,
      hora_inicio: horario.hora_inicio,
      hora_fin: horario.hora_fin,
      activo: horario.activo,
    };

    if (dto.turno !== undefined) {
      horario.turno = dto.turno.trim().toUpperCase();
    }

    const nuevaInicio = dto.hora_inicio
      ? this.normalizeTime(dto.hora_inicio)
      : horario.hora_inicio;
    const nuevaFin = dto.hora_fin
      ? this.normalizeTime(dto.hora_fin)
      : horario.hora_fin;

    const minInicio = this.parseTimeToMinutes(nuevaInicio);
    const minFin = this.parseTimeToMinutes(nuevaFin);

    if (minInicio >= minFin) {
      throw new BadRequestException(
        'La hora de inicio debe ser estrictamente anterior a la hora de fin',
      );
    }

    horario.hora_inicio = nuevaInicio;
    horario.hora_fin = nuevaFin;

    if (dto.activo !== undefined) {
      horario.activo = dto.activo;
    }

    const actualizado = await this.horarioRepo.save(horario);

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo,
      accion: 'UPDATE',
      tabla_afectada: 'horario_operativo',
      id_registro_afectado: String(actualizado.id_horario),
      valores_anteriores: valoresAnteriores,
      valores_nuevos: {
        turno: actualizado.turno,
        hora_inicio: actualizado.hora_inicio,
        hora_fin: actualizado.hora_fin,
        activo: actualizado.activo,
      },
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[HORARIOS] Horario actualizado: ID ${actualizado.id_horario} por ${ejecutor?.correo || 'Sistema'}`,
    );

    return actualizado;
  }

  async cambiarEstado(
    id: number,
    activo: boolean,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    const horario = await this.findOne(id);
    const estadoAnterior = horario.activo;
    horario.activo = activo;
    const guardado = await this.horarioRepo.save(horario);

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo,
      accion: 'CAMBIO_ESTADO',
      tabla_afectada: 'horario_operativo',
      id_registro_afectado: String(guardado.id_horario),
      valores_anteriores: { activo: estadoAnterior },
      valores_nuevos: { activo: guardado.activo },
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[HORARIOS] Horario ID ${guardado.id_horario} estado modificado a ${activo ? 'ACTIVO' : 'INACTIVO'} por ${ejecutor?.correo || 'Sistema'}`,
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
