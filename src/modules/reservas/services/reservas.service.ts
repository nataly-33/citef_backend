import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReservaSala, EstadoReserva, TipoReserva } from '../entities/reserva-sala.entity';
import { AlgoritmoDisponibilidadService } from './algoritmo-disponibilidad.service';
import { ReservasGateway } from '../gateways/reservas.gateway';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { SolicitarReservaDto } from '../dto/solicitar-reserva.dto';
import { EditarReservaDto } from '../dto/editar-reserva.dto';
import {
  ResponderReservaDto,
  AccionResolucionReserva,
} from '../dto/responder-reserva.dto';
import { ConsultarReservasFiltroDto } from '../dto/consultar-reservas-filtro.dto';
import { Docente } from '../../catalogos/entities/docente.entity';
import { Materia } from '../../catalogos/entities/materia.entity';
import { LaboratorioSala } from '../../infraestructura/entities/laboratorio-sala.entity';

@Injectable()
export class ReservasService {
  private readonly logger = new Logger(ReservasService.name);

  constructor(
    @InjectRepository(ReservaSala)
    private readonly reservaRepository: Repository<ReservaSala>,
    @InjectRepository(Docente)
    private readonly docenteRepository: Repository<Docente>,
    @InjectRepository(Materia)
    private readonly materiaRepository: Repository<Materia>,
    @InjectRepository(LaboratorioSala)
    private readonly salaRepository: Repository<LaboratorioSala>,
    private readonly algoritmoService: AlgoritmoDisponibilidadService,
    private readonly auditoriaService: AuditoriaService,
    private readonly reservasGateway: ReservasGateway,
  ) {}

  /**
   * CU16: Solicitar nueva reserva de aula de cómputo (con soporte para EXAMEN y recurrencia semestral)
   */
  async solicitar(
    dto: SolicitarReservaDto,
    currentUser: any,
    ip: string,
  ): Promise<ReservaSala> {
    // 1. Validar existencia del docente
    const docente = await this.docenteRepository.findOne({
      where: { codigo: dto.codigo_docente },
      relations: { usuario: true },
    });
    if (!docente) {
      throw new NotFoundException(
        `El docente con código ${dto.codigo_docente} no existe en el padrón`,
      );
    }

    // Si el usuario es DOCENTE (no admin ni auxiliar), validar que solo pueda solicitar para sí mismo
    const roles: string[] = currentUser?.roles || [];
    const esAdminOAuxiliar = roles.includes('ADMINISTRADOR') || roles.includes('AUXILIAR');
    if (!esAdminOAuxiliar && Number(docente.id_usuario) !== Number(currentUser?.id_usuario)) {
      throw new ForbiddenException(
        'Un docente solo puede registrar solicitudes de reserva para sus propias materias asignadas',
      );
    }

    // 2. Validar existencia de la materia
    const materia = await this.materiaRepository.findOne({
      where: { id_materia: dto.id_materia },
    });
    if (!materia) {
      throw new NotFoundException(
        `La materia con ID ${dto.id_materia} no existe en el catálogo curricular`,
      );
    }

    const tipoReserva = dto.tipo_reserva || TipoReserva.CLASE;

    // 3. Manejo de programación semestral recurrente
    if (dto.fecha_fin_semestre && dto.fecha_fin_semestre > dto.fecha_reserva) {
      return this.crearLoteRecurrente(dto, tipoReserva, currentUser, ip);
    }

    // 4. Validar disponibilidad algorítmica estricta (CU18)
    const validacion = await this.algoritmoService.validarDisponibilidad(
      dto.id_sala,
      dto.fecha_reserva,
      dto.hora_inicio,
      dto.hora_fin,
      dto.cant_estimada_alumnos,
      undefined,
      tipoReserva,
    );

    if (!validacion.disponible) {
      throw new ConflictException(validacion.mensaje);
    }

    // Si es un EXAMEN con prioridad sobre una clase desplazable, notificar y desplazar
    let notifDesplazamiento: string | null = null;
    if (
      tipoReserva === TipoReserva.EXAMEN &&
      validacion.reservaConflicto &&
      validacion.reservaConflicto.esDesplazable
    ) {
      const claseId = validacion.reservaConflicto.id_reserva;
      notifDesplazamiento = `Prioridad de Examen: reprograma el turno ocupado previamente por ${validacion.reservaConflicto.docente_nombre}`;
      await this.reservaRepository.update(claseId, {
        estado: EstadoReserva.PENDIENTE,
        notificacion_docente: `Su clase del día ${dto.fecha_reserva} (${dto.hora_inicio}-${dto.hora_fin}) fue reprogramada por aplicación prioritaria de Examen de ${materia.sigla}.`,
        editada: true,
      });
    }

    // 5. Crear la entidad de reserva
    const nuevaReserva = this.reservaRepository.create({
      id_sala: dto.id_sala,
      codigo_docente: dto.codigo_docente,
      id_materia: dto.id_materia,
      fecha_reserva: dto.fecha_reserva,
      hora_inicio: dto.hora_inicio,
      hora_fin: dto.hora_fin,
      tema_practica: dto.tema_practica.trim(),
      cant_estimada_alumnos: dto.cant_estimada_alumnos,
      tipo_reserva: tipoReserva,
      estado: EstadoReserva.PENDIENTE,
      obs_resolucion: notifDesplazamiento,
      id_usuario_administrador: null,
      editada: false,
    });

    const guardada = await this.reservaRepository.save(nuevaReserva);

    // 6. Auditoría forense inalterable
    await this.auditoriaService.registrar({
      id_usuario: currentUser?.id_usuario,
      correo_usuario: currentUser?.correo || currentUser?.correo_institucional,
      tabla_afectada: 'reserva_sala',
      id_registro_afectado: String(guardada.id_reserva),
      accion: 'INSERT',
      valores_anteriores: null,
      valores_nuevos: {
        id_reserva: guardada.id_reserva,
        sala: dto.id_sala,
        docente: dto.codigo_docente,
        materia: dto.id_materia,
        fecha: dto.fecha_reserva,
        horario: `${dto.hora_inicio} - ${dto.hora_fin}`,
        alumnos: dto.cant_estimada_alumnos,
        tipo: tipoReserva,
      },
      ip_cliente: ip,
    });

    // 7. Notificación síncrona en tiempo real vía WebSocket
    this.reservasGateway.emitirActualizacionReservas({
      accion: 'CREADA',
      id_reserva: guardada.id_reserva,
      id_sala: guardada.id_sala,
      fecha_reserva: guardada.fecha_reserva,
    });

    return this.obtenerPorId(guardada.id_reserva);
  }

  /**
   * Genera el lote de reservas semanales recurrentes para un semestre
   */
  private async crearLoteRecurrente(
    dto: SolicitarReservaDto,
    tipoReserva: TipoReserva,
    currentUser: any,
    ip: string,
  ): Promise<ReservaSala> {
    const idLote = `SEM_${Date.now()}`;
    const inicio = new Date(dto.fecha_reserva + 'T12:00:00Z');
    const fin = new Date(dto.fecha_fin_semestre + 'T12:00:00Z');

    const diaObjetivo = inicio.getUTCDay(); // 0 a 6
    const reservasCreadas: ReservaSala[] = [];

    const actual = new Date(inicio);
    while (actual <= fin) {
      if (actual.getUTCDay() === diaObjetivo) {
        const fechaIso = actual.toISOString().split('T')[0];
        try {
          // Validar disponibilidad
          const val = await this.algoritmoService.validarDisponibilidad(
            dto.id_sala,
            fechaIso,
            dto.hora_inicio,
            dto.hora_fin,
            dto.cant_estimada_alumnos,
            undefined,
            tipoReserva,
          );

          if (val.disponible) {
            const r = this.reservaRepository.create({
              id_sala: dto.id_sala,
              codigo_docente: dto.codigo_docente,
              id_materia: dto.id_materia,
              fecha_reserva: fechaIso,
              hora_inicio: dto.hora_inicio,
              hora_fin: dto.hora_fin,
              tema_practica: `${dto.tema_practica.trim()} (Clase Semestral)`,
              cant_estimada_alumnos: dto.cant_estimada_alumnos,
              tipo_reserva: tipoReserva,
              estado: EstadoReserva.PENDIENTE,
              id_lote_recurrente: idLote,
              editada: false,
            });
            const guardada = await this.reservaRepository.save(r);
            reservasCreadas.push(guardada);
          }
        } catch (e) {
          this.logger.warn(`Omisión de fecha ${fechaIso} por conflicto en lote recurrente: ${e}`);
        }
      }
      actual.setUTCDate(actual.getUTCDate() + 1);
    }

    // Auditoría
    await this.auditoriaService.registrar({
      id_usuario: currentUser?.id_usuario,
      correo_usuario: currentUser?.correo || currentUser?.correo_institucional,
      tabla_afectada: 'reserva_sala',
      id_registro_afectado: idLote,
      accion: 'INSERT_LOTE_SEMESTRAL',
      valores_nuevos: {
        total_clases_programadas: reservasCreadas.length,
        id_lote: idLote,
        rango: `${dto.fecha_reserva} al ${dto.fecha_fin_semestre}`,
      },
      ip_cliente: ip,
    });

    this.reservasGateway.emitirActualizacionReservas({
      accion: 'LOTE_CREADO',
      id_lote: idLote,
      total: reservasCreadas.length,
    });

    if (reservasCreadas.length > 0) {
      return this.obtenerPorId(reservasCreadas[0].id_reserva);
    }

    throw new ConflictException('No se pudieron programar clases debido a conflictos de horario en el semestre');
  }

  /**
   * Modificar / Editar reserva existente (Docente o Administrador)
   */
  async editar(
    id_reserva: number,
    dto: EditarReservaDto,
    currentUser: any,
    ip: string,
  ): Promise<ReservaSala> {
    const reserva = await this.obtenerPorId(id_reserva);

    if (
      reserva.estado === EstadoReserva.CANCELADA ||
      reserva.estado === EstadoReserva.FINALIZADA
    ) {
      throw new BadRequestException(
        `La reserva ya se encuentra ${reserva.estado} y no puede ser modificada`,
      );
    }

    const roles: string[] = currentUser?.roles || [];
    const esAdmin = roles.includes('ADMINISTRADOR');

    // Si es docente ordinario, solo puede editar sus propias reservas
    if (!esAdmin && Number(reserva.docente.id_usuario) !== Number(currentUser?.id_usuario)) {
      throw new ForbiddenException(
        'Solo el docente titular de la solicitud o un Administrador pueden modificar la reserva',
      );
    }

    const valoresAnteriores = {
      id_sala: reserva.id_sala,
      fecha_reserva: reserva.fecha_reserva,
      hora_inicio: reserva.hora_inicio,
      hora_fin: reserva.hora_fin,
      tema_practica: reserva.tema_practica,
      cant_estimada_alumnos: reserva.cant_estimada_alumnos,
      estado: reserva.estado,
      tipo_reserva: reserva.tipo_reserva,
    };

    const nuevaSala = dto.id_sala || reserva.id_sala;
    const nuevaFecha = dto.fecha_reserva || reserva.fecha_reserva;
    const nuevaHoraInicio = dto.hora_inicio || reserva.hora_inicio;
    const nuevaHoraFin = dto.hora_fin || reserva.hora_fin;
    const nuevaCant = dto.cant_estimada_alumnos || reserva.cant_estimada_alumnos;
    const nuevoTipo = dto.tipo_reserva || reserva.tipo_reserva;

    // Validar disponibilidad horaria si cambiaron sala, fecha u horarios
    if (
      nuevaSala !== reserva.id_sala ||
      nuevaFecha !== reserva.fecha_reserva ||
      nuevaHoraInicio !== reserva.hora_inicio ||
      nuevaHoraFin !== reserva.hora_fin
    ) {
      const val = await this.algoritmoService.validarDisponibilidad(
        nuevaSala,
        nuevaFecha,
        nuevaHoraInicio,
        nuevaHoraFin,
        nuevaCant,
        id_reserva,
        nuevoTipo,
      );

      if (!val.disponible) {
        throw new ConflictException(val.mensaje);
      }
    }

    // Aplicar cambios
    reserva.id_sala = nuevaSala;
    reserva.fecha_reserva = nuevaFecha;
    reserva.hora_inicio = nuevaHoraInicio;
    reserva.hora_fin = nuevaHoraFin;
    if (dto.tema_practica) reserva.tema_practica = dto.tema_practica.trim();
    if (dto.cant_estimada_alumnos) reserva.cant_estimada_alumnos = dto.cant_estimada_alumnos;
    if (dto.tipo_reserva) reserva.tipo_reserva = dto.tipo_reserva;

    // Regla de negocio de edición:
    // Siempre se marca 'editada = true' para que el Administrador vea el puntito rojo en el calendario.
    reserva.editada = true;

    // Si la editó el docente, vuelve a PENDIENTE para que Jefatura la revise y dictamine de nuevo.
    if (!esAdmin) {
      reserva.estado = EstadoReserva.PENDIENTE;
      reserva.obs_resolucion = `Modificada por el docente solicitante: ${dto.obs_edicion || 'Horario/sala actualizada'}`;
    } else {
      // Si la editó el administrador, registra notificación formal para el docente
      if (dto.obs_edicion) {
        reserva.notificacion_docente = dto.obs_edicion.trim();
      }
    }

    const actualizada = await this.reservaRepository.save(reserva);

    // Auditoría
    await this.auditoriaService.registrar({
      id_usuario: currentUser?.id_usuario,
      correo_usuario: currentUser?.correo || currentUser?.correo_institucional,
      tabla_afectada: 'reserva_sala',
      id_registro_afectado: String(id_reserva),
      accion: 'UPDATE',
      valores_anteriores: valoresAnteriores,
      valores_nuevos: {
        id_sala: actualizada.id_sala,
        fecha_reserva: actualizada.fecha_reserva,
        hora_inicio: actualizada.hora_inicio,
        hora_fin: actualizada.hora_fin,
        editada: true,
        estado: actualizada.estado,
        obs_edicion: dto.obs_edicion,
      },
      ip_cliente: ip,
    });

    // Emisión síncrona WebSocket
    this.reservasGateway.emitirActualizacionReservas({
      accion: 'EDITADA',
      id_reserva: actualizada.id_reserva,
      id_sala: actualizada.id_sala,
      estado: actualizada.estado,
      editada: true,
    });

    return this.obtenerPorId(actualizada.id_reserva);
  }

  /**
   * CU17: Listado general paginado de reservas con filtros
   */
  async listar(
    filtros: ConsultarReservasFiltroDto,
    currentUser: any,
  ): Promise<{
    data: ReservaSala[];
    total: number;
    pagina: number;
    limite: number;
    totalPaginas: number;
  }> {
    const pagina = filtros.pagina && filtros.pagina > 0 ? Number(filtros.pagina) : 1;
    const limite = filtros.limite && filtros.limite > 0 ? Number(filtros.limite) : 15;
    const skip = (pagina - 1) * limite;

    const qb = this.reservaRepository
      .createQueryBuilder('reserva')
      .leftJoinAndSelect('reserva.sala', 'sala')
      .leftJoinAndSelect('reserva.docente', 'docente')
      .leftJoinAndSelect('docente.usuario', 'usuario_docente')
      .leftJoinAndSelect('reserva.materia', 'materia')
      .leftJoinAndSelect('reserva.administrador', 'administrador')
      .orderBy('reserva.fecha_reserva', 'DESC')
      .addOrderBy('reserva.hora_inicio', 'ASC');

    if (filtros.id_sala) {
      qb.andWhere('reserva.id_sala = :id_sala', { id_sala: filtros.id_sala });
    }

    if (filtros.fecha_desde) {
      qb.andWhere('reserva.fecha_reserva >= :fecha_desde', {
        fecha_desde: filtros.fecha_desde,
      });
    }

    if (filtros.fecha_hasta) {
      qb.andWhere('reserva.fecha_reserva <= :fecha_hasta', {
        fecha_hasta: filtros.fecha_hasta,
      });
    }

    if (filtros.estado) {
      qb.andWhere('reserva.estado = :estado', { estado: filtros.estado });
    }

    if (filtros.codigo_docente) {
      qb.andWhere('reserva.codigo_docente = :codigo_docente', {
        codigo_docente: filtros.codigo_docente,
      });
    }

    if (filtros.busqueda && filtros.busqueda.trim() !== '') {
      const termino = `%${filtros.busqueda.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(sala.codigo_sala) LIKE :term OR LOWER(sala.nombre) LIKE :term OR LOWER(materia.nombre) LIKE :term OR LOWER(materia.sigla) LIKE :term OR LOWER(reserva.tema_practica) LIKE :term OR LOWER(usuario_docente.nombres) LIKE :term OR LOWER(usuario_docente.apellidos) LIKE :term OR LOWER(reserva.codigo_docente) LIKE :term)',
        { term: termino },
      );
    }

    const [data, total] = await qb.skip(skip).take(limite).getManyAndCount();

    return {
      data,
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite) || 1,
    };
  }

  /**
   * CU17: Obtener reservas en un rango de fechas para el Calendario Interactivo
   */
  async obtenerParaCalendario(
    id_sala?: number,
    fecha_desde?: string,
    fecha_hasta?: string,
  ): Promise<ReservaSala[]> {
    const qb = this.reservaRepository
      .createQueryBuilder('reserva')
      .leftJoinAndSelect('reserva.sala', 'sala')
      .leftJoinAndSelect('reserva.docente', 'docente')
      .leftJoinAndSelect('docente.usuario', 'usuario_docente')
      .leftJoinAndSelect('reserva.materia', 'materia')
      .where('reserva.estado != :cancelada', { cancelada: EstadoReserva.CANCELADA })
      .orderBy('reserva.fecha_reserva', 'ASC')
      .addOrderBy('reserva.hora_inicio', 'ASC');

    if (id_sala) {
      qb.andWhere('reserva.id_sala = :id_sala', { id_sala });
    }

    if (fecha_desde) {
      qb.andWhere('reserva.fecha_reserva >= :fecha_desde', { fecha_desde });
    }

    if (fecha_hasta) {
      qb.andWhere('reserva.fecha_reserva <= :fecha_hasta', { fecha_hasta });
    }

    return qb.getMany();
  }

  /**
   * CU18: Consulta directa de disponibilidad para validación reactiva en frontend
   */
  async validarDisponibilidad(
    id_sala: number,
    fecha: string,
    hora_inicio: string,
    hora_fin: string,
    cant_alumnos?: number,
    excluirIdReserva?: number,
    tipo_reserva?: TipoReserva,
  ) {
    return this.algoritmoService.validarDisponibilidad(
      id_sala,
      fecha,
      hora_inicio,
      hora_fin,
      cant_alumnos,
      excluirIdReserva,
      tipo_reserva,
    );
  }

  /**
   * Obtener detalle de una reserva por su ID
   */
  async obtenerPorId(id_reserva: number): Promise<ReservaSala> {
    const reserva = await this.reservaRepository.findOne({
      where: { id_reserva },
      relations: {
        sala: true,
        docente: { usuario: true },
        materia: true,
        administrador: true,
      },
    });

    if (!reserva) {
      throw new NotFoundException(`La reserva con ID ${id_reserva} no existe`);
    }

    return reserva;
  }

  /**
   * CU20: Gestionar reserva por Jefatura (Aprobar / Rechazar)
   */
  async gestionar(
    id_reserva: number,
    dto: ResponderReservaDto,
    currentUser: any,
    ip: string,
  ): Promise<ReservaSala> {
    const reserva = await this.obtenerPorId(id_reserva);

    if (reserva.estado !== EstadoReserva.PENDIENTE) {
      throw new BadRequestException(
        `Solo se pueden dictaminar solicitudes en estado PENDIENTE (Estado actual: ${reserva.estado})`,
      );
    }

    const datosAnteriores = {
      estado: reserva.estado,
      obs_resolucion: reserva.obs_resolucion,
      id_usuario_administrador: reserva.id_usuario_administrador,
      editada: reserva.editada,
    };

    if (dto.accion === AccionResolucionReserva.APROBAR) {
      const validacion = await this.algoritmoService.validarDisponibilidad(
        reserva.id_sala,
        reserva.fecha_reserva,
        reserva.hora_inicio,
        reserva.hora_fin,
        reserva.cant_estimada_alumnos,
        reserva.id_reserva,
        reserva.tipo_reserva,
      );

      if (!validacion.disponible) {
        throw new ConflictException(
          `Existe un conflicto horario insalvable con otra reserva aprobada: ${validacion.mensaje}`,
        );
      }

      reserva.estado = EstadoReserva.APROBADA;
      reserva.obs_resolucion = dto.obs_resolucion?.trim() || 'Aprobada por Jefatura';
      reserva.editada = false; // Al dictaminar formalmente, se limpia la bandera de editada
    } else {
      if (!dto.obs_resolucion || dto.obs_resolucion.trim() === '') {
        throw new BadRequestException(
          'Debe justificar obligatoriamente el motivo del rechazo de la solicitud',
        );
      }
      reserva.estado = EstadoReserva.RECHAZADA;
      reserva.obs_resolucion = dto.obs_resolucion.trim();
      reserva.editada = false;
    }

    reserva.id_usuario_administrador = currentUser?.id_usuario;

    const actualizada = await this.reservaRepository.save(reserva);

    // Auditoría forense
    await this.auditoriaService.registrar({
      id_usuario: currentUser?.id_usuario,
      correo_usuario: currentUser?.correo || currentUser?.correo_institucional,
      tabla_afectada: 'reserva_sala',
      id_registro_afectado: String(id_reserva),
      accion: 'UPDATE',
      valores_anteriores: datosAnteriores,
      valores_nuevos: {
        estado: actualizada.estado,
        obs_resolucion: actualizada.obs_resolucion,
        id_usuario_administrador: actualizada.id_usuario_administrador,
        editada: false,
      },
      ip_cliente: ip,
    });

    // Emisión síncrona WebSocket
    this.reservasGateway.emitirActualizacionReservas({
      accion: 'DICTAMINADA',
      id_reserva: actualizada.id_reserva,
      estado: actualizada.estado,
      id_sala: actualizada.id_sala,
    });

    return this.obtenerPorId(actualizada.id_reserva);
  }

  /**
   * CU19: Cancelar reserva de aula (Exclusivo de docente titular)
   */
  async cancelar(
    id_reserva: number,
    motivo: string,
    currentUser: any,
    ip: string,
  ): Promise<ReservaSala> {
    const reserva = await this.obtenerPorId(id_reserva);

    if (
      reserva.estado === EstadoReserva.CANCELADA ||
      reserva.estado === EstadoReserva.FINALIZADA
    ) {
      throw new BadRequestException(
        `La reserva ya se encuentra ${reserva.estado} y no puede cancelarse`,
      );
    }

    const roles: string[] = currentUser?.roles || [];
    const esAdmin = roles.includes('ADMINISTRADOR');

    // Validación de pertenencia: Solo el docente titular puede cancelar su reserva
    if (!esAdmin && Number(reserva.docente.id_usuario) !== Number(currentUser?.id_usuario)) {
      throw new ForbiddenException(
        'Solo el docente titular de la solicitud puede cancelar su reserva',
      );
    }

    const datosAnteriores = {
      estado: reserva.estado,
      obs_resolucion: reserva.obs_resolucion,
    };

    reserva.estado = EstadoReserva.CANCELADA;
    const notaCancelacion = `Cancelada por el docente titular: ${motivo ? motivo.trim() : 'Sin motivo especificado'}`;
    reserva.obs_resolucion = reserva.obs_resolucion
      ? `${reserva.obs_resolucion} | ${notaCancelacion}`
      : notaCancelacion;

    const actualizada = await this.reservaRepository.save(reserva);

    // Auditoría forense
    await this.auditoriaService.registrar({
      id_usuario: currentUser?.id_usuario,
      correo_usuario: currentUser?.correo || currentUser?.correo_institucional,
      tabla_afectada: 'reserva_sala',
      id_registro_afectado: String(id_reserva),
      accion: 'UPDATE',
      valores_anteriores: datosAnteriores,
      valores_nuevos: {
        estado: actualizada.estado,
        obs_resolucion: actualizada.obs_resolucion,
      },
      ip_cliente: ip,
    });

    // Emisión síncrona WebSocket
    this.reservasGateway.emitirActualizacionReservas({
      accion: 'CANCELADA',
      id_reserva: actualizada.id_reserva,
      id_sala: actualizada.id_sala,
      estado: EstadoReserva.CANCELADA,
    });

    return this.obtenerPorId(actualizada.id_reserva);
  }
}
