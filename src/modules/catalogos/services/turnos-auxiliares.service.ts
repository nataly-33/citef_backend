import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AsignarTurno } from '../entities/asignar-turno.entity';
import { HorarioOperativo } from '../entities/horario-operativo.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { AsignarTurnoDto } from '../dto/asignar-turno.dto';
import { ActualizarTurnoDto } from '../dto/actualizar-turno.dto';
import { AuditoriaService } from '../../auditoria/auditoria.service';

@Injectable()
export class TurnosAuxiliaresService {
  private readonly logger = new Logger(TurnosAuxiliaresService.name);

  constructor(
    @InjectRepository(AsignarTurno)
    private readonly turnoRepo: Repository<AsignarTurno>,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(HorarioOperativo)
    private readonly horarioRepo: Repository<HorarioOperativo>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  private parseTimeToMinutes(t: string): number {
    const parts = t.split(':').map(Number);
    return parts[0] * 60 + (parts[1] || 0);
  }

  async listarAuxiliaresDisponibles() {
    const auxiliares = await this.usuarioRepo
      .createQueryBuilder('u')
      .innerJoin('u.roles', 'r')
      .where('r.nombre = :rol', { rol: 'AUXILIAR' })
      .andWhere('u.activo = :activo', { activo: true })
      .select([
        'u.id_usuario',
        'u.nombres',
        'u.apellidos',
        'u.correo_institucional',
        'u.telefono',
        'u.activo',
      ])
      .orderBy('u.apellidos', 'ASC')
      .addOrderBy('u.nombres', 'ASC')
      .getMany();

    return auxiliares;
  }

  async listarHorariosDisponibles() {
    return this.horarioRepo.find({
      where: { activo: true },
      order: { hora_inicio: 'ASC' },
    });
  }

  async findAll(params?: {
    pagina?: number;
    limite?: number;
    semestre?: string;
    id_usuario?: number;
    activo?: boolean;
    todos?: boolean;
  }) {
    if (params?.todos) {
      const qb = this.turnoRepo
        .createQueryBuilder('t')
        .leftJoinAndSelect('t.usuario', 'u')
        .leftJoinAndSelect('t.horario', 'h')
        .orderBy('t.creado_en', 'DESC');

      if (params.semestre) {
        qb.andWhere('t.semestre = :semestre', { semestre: params.semestre });
      }

      if (params.id_usuario) {
        qb.andWhere('t.id_usuario = :id_usuario', {
          id_usuario: params.id_usuario,
        });
      }

      if (params.activo !== undefined) {
        qb.andWhere('t.activo = :activo', { activo: params.activo });
      }

      return qb.getMany();
    }

    const limite = params?.limite || 15;
    const pagina = params?.pagina || 1;
    const skip = (pagina - 1) * limite;

    const qb = this.turnoRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.usuario', 'u')
      .leftJoinAndSelect('t.horario', 'h')
      .orderBy('t.creado_en', 'DESC')
      .take(limite)
      .skip(skip);

    if (params?.semestre) {
      qb.andWhere('t.semestre = :semestre', { semestre: params.semestre });
    }

    if (params?.id_usuario) {
      qb.andWhere('t.id_usuario = :id_usuario', {
        id_usuario: params.id_usuario,
      });
    }

    if (params?.activo !== undefined) {
      qb.andWhere('t.activo = :activo', { activo: params.activo });
    }

    const [items, total] = await qb.getManyAndCount();

    // Sanitizar usuario si contiene password_hash
    const sanitized = items.map((item) => {
      if (item.usuario) {
        const { password_hash, ...uRest } = item.usuario as any;
        item.usuario = uRest;
      }
      return item;
    });

    return {
      total,
      pagina,
      limite,
      paginas_totales: Math.ceil(total / limite),
      items: sanitized,
    };
  }

  async findOne(id: number) {
    const turno = await this.turnoRepo.findOne({
      where: { id_asignacion_turno: id },
      relations: { usuario: true, horario: true },
    });

    if (!turno) {
      throw new NotFoundException(
        `Asignación de turno con ID ${id} no encontrada`,
      );
    }

    if (turno.usuario) {
      const { password_hash, ...uRest } = turno.usuario as any;
      turno.usuario = uRest;
    }

    return turno;
  }

  private async validarSuperposicion(
    idUsuario: number,
    idHorario: number,
    semestre: string,
    fechaInicio: string,
    fechaFin: string,
    excludeId?: number,
  ) {
    if (new Date(fechaInicio) > new Date(fechaFin)) {
      throw new BadRequestException(
        'La fecha de inicio debe ser anterior o igual a la fecha de finalización',
      );
    }

    const horarioNuevo = await this.horarioRepo.findOne({
      where: { id_horario: idHorario },
    });

    if (!horarioNuevo) {
      throw new NotFoundException(
        `El horario operativo con ID ${idHorario} no existe`,
      );
    }

    const qb = this.turnoRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.horario', 'h')
      .where('t.id_usuario = :idUsuario', { idUsuario })
      .andWhere('t.semestre = :semestre', { semestre })
      .andWhere('t.activo = :activo', { activo: true });

    if (excludeId) {
      qb.andWhere('t.id_asignacion_turno != :excludeId', { excludeId });
    }

    const asignacionesExistentes = await qb.getMany();

    const nuevoInicioMin = this.parseTimeToMinutes(horarioNuevo.hora_inicio);
    const nuevoFinMin = this.parseTimeToMinutes(horarioNuevo.hora_fin);

    for (const exist of asignacionesExistentes) {
      // 1. Superposición de periodo de fechas
      const solapanFechas =
        fechaInicio <= exist.fecha_fin && fechaFin >= exist.fecha_inicio;

      if (!solapanFechas) continue;

      // 2. Mismo horario exacto
      if (exist.id_horario === idHorario) {
        throw new ConflictException(
          `El auxiliar ya tiene asignado exactamente este turno (${exist.horario.turno}) en el semestre ${semestre}`,
        );
      }

      // 3. Superposición de franjas horarias
      const existInicioMin = this.parseTimeToMinutes(exist.horario.hora_inicio);
      const existFinMin = this.parseTimeToMinutes(exist.horario.hora_fin);

      const solapanHoras =
        nuevoInicioMin < existFinMin && nuevoFinMin > existInicioMin;

      if (solapanHoras) {
        throw new ConflictException(
          `Superposición de turnos detectada: El auxiliar ya tiene asignado un turno (${exist.horario.turno}: ${exist.horario.hora_inicio}–${exist.horario.hora_fin}) en el semestre ${semestre} que se solapa con el turno seleccionado (${horarioNuevo.turno}: ${horarioNuevo.hora_inicio}–${horarioNuevo.hora_fin})`,
        );
      }
    }

    return horarioNuevo;
  }

  async asignarTurno(
    dto: AsignarTurnoDto,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    // 1. Validar existencia y rol del usuario
    const usuario = await this.usuarioRepo.findOne({
      where: { id_usuario: dto.id_usuario },
      relations: { roles: true },
    });

    if (!usuario) {
      throw new NotFoundException(
        `Usuario con ID ${dto.id_usuario} no encontrado`,
      );
    }

    if (!usuario.activo) {
      throw new BadRequestException('El usuario seleccionado no está activo');
    }

    const esAuxiliar = usuario.roles?.some((r) => r.nombre === 'AUXILIAR');
    if (!esAuxiliar) {
      throw new BadRequestException(
        `El usuario "${usuario.nombres} ${usuario.apellidos}" no cuenta con el rol AUXILIAR requerido para asignación de turnos de sala`,
      );
    }

    // 2. Validar superposición de turnos
    const horario = await this.validarSuperposicion(
      dto.id_usuario,
      dto.id_horario,
      dto.semestre.trim(),
      dto.fecha_inicio,
      dto.fecha_fin,
    );

    // 3. Crear asignación
    const nuevaAsignacion = this.turnoRepo.create({
      id_usuario: dto.id_usuario,
      id_horario: dto.id_horario,
      semestre: dto.semestre.trim(),
      fecha_inicio: dto.fecha_inicio,
      fecha_fin: dto.fecha_fin,
      activo: dto.activo !== undefined ? dto.activo : true,
    });

    const guardada = await this.turnoRepo.save(nuevaAsignacion);

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo,
      accion: 'INSERT',
      tabla_afectada: 'asignar_turno',
      id_registro_afectado: String(guardada.id_asignacion_turno),
      valores_nuevos: {
        id_usuario: guardada.id_usuario,
        auxiliar: `${usuario.nombres} ${usuario.apellidos}`,
        id_horario: guardada.id_horario,
        horario: `${horario.turno} (${horario.hora_inicio}–${horario.hora_fin})`,
        semestre: guardada.semestre,
        fecha_inicio: guardada.fecha_inicio,
        fecha_fin: guardada.fecha_fin,
        activo: guardada.activo,
      },
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[TURNOS] Turno asignado: ID ${guardada.id_asignacion_turno} al auxiliar "${usuario.nombres} ${usuario.apellidos}" en turno ${horario.turno} (Semestre: ${guardada.semestre}) por ${ejecutor?.correo || 'Sistema'}`,
    );

    return this.findOne(guardada.id_asignacion_turno);
  }

  async actualizar(
    id: number,
    dto: ActualizarTurnoDto,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    const turno = await this.findOne(id);

    const valoresAnteriores = {
      id_horario: turno.id_horario,
      semestre: turno.semestre,
      fecha_inicio: turno.fecha_inicio,
      fecha_fin: turno.fecha_fin,
      activo: turno.activo,
    };

    const targetHorarioId = dto.id_horario ?? turno.id_horario;
    const targetSemestre = dto.semestre ? dto.semestre.trim() : turno.semestre;
    const targetFechaInicio = dto.fecha_inicio ?? turno.fecha_inicio;
    const targetFechaFin = dto.fecha_fin ?? turno.fecha_fin;

    await this.validarSuperposicion(
      turno.id_usuario,
      targetHorarioId,
      targetSemestre,
      targetFechaInicio,
      targetFechaFin,
      id,
    );

    turno.id_horario = targetHorarioId;
    turno.semestre = targetSemestre;
    turno.fecha_inicio = targetFechaInicio;
    turno.fecha_fin = targetFechaFin;
    if (dto.activo !== undefined) turno.activo = dto.activo;

    const actualizado = await this.turnoRepo.save(turno);

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo,
      accion: 'UPDATE',
      tabla_afectada: 'asignar_turno',
      id_registro_afectado: String(actualizado.id_asignacion_turno),
      valores_anteriores: valoresAnteriores,
      valores_nuevos: {
        id_horario: actualizado.id_horario,
        semestre: actualizado.semestre,
        fecha_inicio: actualizado.fecha_inicio,
        fecha_fin: actualizado.fecha_fin,
        activo: actualizado.activo,
      },
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[TURNOS] Asignación de turno ID ${actualizado.id_asignacion_turno} actualizada por ${ejecutor?.correo || 'Sistema'}`,
    );

    return this.findOne(actualizado.id_asignacion_turno);
  }

  async cambiarEstado(
    id: number,
    activo: boolean,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    const turno = await this.findOne(id);
    const estadoAnterior = turno.activo;
    turno.activo = activo;
    const guardado = await this.turnoRepo.save(turno);

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo,
      accion: 'CAMBIO_ESTADO',
      tabla_afectada: 'asignar_turno',
      id_registro_afectado: String(guardado.id_asignacion_turno),
      valores_anteriores: { activo: estadoAnterior },
      valores_nuevos: { activo: guardado.activo },
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[TURNOS] Turno ID ${guardado.id_asignacion_turno} estado modificado a ${activo ? 'ACTIVO' : 'INACTIVO'} por ${ejecutor?.correo || 'Sistema'}`,
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
