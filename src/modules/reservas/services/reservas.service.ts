import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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

    // Normalizar salas seleccionadas (soporte multi-sala para cátedras con muchos alumnos)
    const idsSalas = Array.from(
      new Set(
        dto.ids_salas && dto.ids_salas.length > 0
          ? dto.ids_salas.map(Number)
          : [Number(dto.id_sala)],
      ),
    );

    const salas = await this.salaRepository.find({
      where: { id_sala: In(idsSalas) },
    });
    if (salas.length !== idsSalas.length) {
      throw new NotFoundException('Una o más salas seleccionadas no existen en el sistema');
    }

    // Validar capacidad combinada total
    const capacidadTotal = salas.reduce((acc, s) => acc + (s.cant_estudiantes || 0), 0);
    if (dto.cant_estimada_alumnos > capacidadTotal) {
      throw new BadRequestException(
        `La cantidad estimada (${dto.cant_estimada_alumnos} alumnos) excede la capacidad combinada de las salas seleccionadas (${capacidadTotal} puestos).`,
      );
    }

    // 3. Manejo de programación semestral recurrente
    if (dto.fecha_fin_semestre && dto.fecha_fin_semestre > dto.fecha_reserva) {
      return this.crearLoteRecurrente(dto, salas, capacidadTotal, tipoReserva, currentUser, ip);
    }

    // Proporción por sala basada en la capacidad física individual
    let restante = dto.cant_estimada_alumnos;
    const asignaciones: { sala: LaboratorioSala; cant: number }[] = [];
    for (let i = 0; i < salas.length; i++) {
      const s = salas[i];
      if (i === salas.length - 1) {
        asignaciones.push({
          sala: s,
          cant: Math.min(s.cant_estudiantes, Math.max(1, restante)),
        });
      } else {
        const prop = Math.round(dto.cant_estimada_alumnos * (s.cant_estudiantes / capacidadTotal));
        const asignada = Math.min(
          s.cant_estudiantes,
          Math.max(1, Math.min(restante - (salas.length - 1 - i), prop)),
        );
        asignaciones.push({ sala: s, cant: asignada });
        restante -= asignada;
      }
    }

    // 4. Validar disponibilidad algorítmica para cada sala
    for (const a of asignaciones) {
      const validacion = await this.algoritmoService.validarDisponibilidad(
        a.sala.id_sala,
        dto.fecha_reserva,
        dto.hora_inicio,
        dto.hora_fin,
        a.cant,
        undefined,
        tipoReserva,
      );

      if (!validacion.disponible) {
        throw new ConflictException(
          `Conflicto en la sala ${a.sala.codigo_sala}: ${validacion.mensaje}`,
        );
      }

      // Si es un EXAMEN con prioridad sobre una clase regular desplazable
      if (
        tipoReserva === TipoReserva.EXAMEN &&
        validacion.reservaConflicto &&
        validacion.reservaConflicto.esDesplazable
      ) {
        const claseId = validacion.reservaConflicto.id_reserva;
        await this.reservaRepository.update(claseId, {
          estado: EstadoReserva.PENDIENTE,
          notificacion_docente: `Su clase del día ${dto.fecha_reserva} (${dto.hora_inicio}-${dto.hora_fin}) fue reprogramada por aplicación prioritaria de Examen de ${materia.sigla}.`,
          editada: true,
        });
      }
    }

    const idGrupo =
      salas.length > 1
        ? `GRP_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        : null;

    const salasGrupoJson =
      salas.length > 1
        ? asignaciones.map((a) => ({
            id_sala: a.sala.id_sala,
            codigo_sala: a.sala.codigo_sala,
            nombre: a.sala.nombre,
            capacidad: a.sala.cant_estudiantes,
            cant_asignada: a.cant,
          }))
        : null;

    // 5. Crear la(s) entidad(es) de reserva
    const creadas: ReservaSala[] = [];
    for (const a of asignaciones) {
      const nuevaReserva = this.reservaRepository.create({
        id_sala: a.sala.id_sala,
        codigo_docente: dto.codigo_docente,
        id_materia: dto.id_materia,
        fecha_reserva: dto.fecha_reserva,
        hora_inicio: dto.hora_inicio,
        hora_fin: dto.hora_fin,
        tema_practica: dto.tema_practica.trim(),
        cant_estimada_alumnos: a.cant,
        cant_total_alumnos: dto.cant_estimada_alumnos,
        id_grupo_multisala: idGrupo,
        salas_grupo: salasGrupoJson,
        tipo_reserva: tipoReserva,
        estado: EstadoReserva.PENDIENTE,
        obs_resolucion: null,
        id_usuario_administrador: null,
        editada: false,
      });

      const guardada = await this.reservaRepository.save(nuevaReserva);
      creadas.push(guardada);

      // 6. Auditoría forense
      await this.auditoriaService.registrar({
        id_usuario: currentUser?.id_usuario,
        correo_usuario: currentUser?.correo || currentUser?.correo_institucional,
        tabla_afectada: 'reserva_sala',
        id_registro_afectado: String(guardada.id_reserva),
        accion: 'INSERT',
        valores_anteriores: null,
        valores_nuevos: {
          id_reserva: guardada.id_reserva,
          sala: a.sala.id_sala,
          grupo_multisala: idGrupo,
          docente: dto.codigo_docente,
          materia: dto.id_materia,
          fecha: dto.fecha_reserva,
          horario: `${dto.hora_inicio} - ${dto.hora_fin}`,
          alumnos_sala: a.cant,
          alumnos_totales: dto.cant_estimada_alumnos,
          tipo: tipoReserva,
        },
        ip_cliente: ip,
      });

      // 7. Notificación WebSocket
      this.reservasGateway.emitirActualizacionReservas({
        accion: 'CREADA',
        id_reserva: guardada.id_reserva,
        id_sala: guardada.id_sala,
        fecha_reserva: guardada.fecha_reserva,
      });
    }

    return this.obtenerPorId(creadas[0].id_reserva);
  }

  /**
   * Genera el lote de reservas semanales recurrentes para un semestre
   */
  private async crearLoteRecurrente(
    dto: SolicitarReservaDto,
    salas: LaboratorioSala[],
    capacidadTotal: number,
    tipoReserva: TipoReserva,
    currentUser: any,
    ip: string,
  ): Promise<ReservaSala> {
    const idLote = `SEM_${Date.now()}`;
    const inicio = new Date(dto.fecha_reserva + 'T12:00:00Z');
    const fin = new Date(dto.fecha_fin_semestre + 'T12:00:00Z');

    const diasObjetivo: number[] =
      dto.dias_semana && dto.dias_semana.length > 0
        ? dto.dias_semana.map(Number)
        : [inicio.getUTCDay()];

    const reservasCreadas: ReservaSala[] = [];

    const actual = new Date(inicio);
    while (actual <= fin) {
      if (diasObjetivo.includes(actual.getUTCDay())) {
        const fechaIso = actual.toISOString().split('T')[0];
        try {
          if (salas.length === 1) {
            const val = await this.algoritmoService.validarDisponibilidad(
              salas[0].id_sala,
              fechaIso,
              dto.hora_inicio,
              dto.hora_fin,
              dto.cant_estimada_alumnos,
              undefined,
              tipoReserva,
            );

            if (val.disponible) {
              const r = this.reservaRepository.create({
                id_sala: salas[0].id_sala,
                codigo_docente: dto.codigo_docente,
                id_materia: dto.id_materia,
                fecha_reserva: fechaIso,
                hora_inicio: dto.hora_inicio,
                hora_fin: dto.hora_fin,
                tema_practica: dto.tema_practica.trim(),
                cant_estimada_alumnos: dto.cant_estimada_alumnos,
                cant_total_alumnos: dto.cant_estimada_alumnos,
                tipo_reserva: tipoReserva,
                estado: EstadoReserva.PENDIENTE,
                id_lote_recurrente: idLote,
                editada: false,
              });
              const guardada = await this.reservaRepository.save(r);
              reservasCreadas.push(guardada);
            }
          } else {
            // Multi-sala en recurrencia semestral
            let restante = dto.cant_estimada_alumnos;
            const asignaciones: { sala: LaboratorioSala; cant: number }[] = [];
            for (let i = 0; i < salas.length; i++) {
              const s = salas[i];
              if (i === salas.length - 1) {
                asignaciones.push({
                  sala: s,
                  cant: Math.min(s.cant_estudiantes, Math.max(1, restante)),
                });
              } else {
                const prop = Math.round(dto.cant_estimada_alumnos * (s.cant_estudiantes / capacidadTotal));
                const asignada = Math.min(
                  s.cant_estudiantes,
                  Math.max(1, Math.min(restante - (salas.length - 1 - i), prop)),
                );
                asignaciones.push({ sala: s, cant: asignada });
                restante -= asignada;
              }
            }

            let todasDisponibles = true;
            for (const a of asignaciones) {
              const val = await this.algoritmoService.validarDisponibilidad(
                a.sala.id_sala,
                fechaIso,
                dto.hora_inicio,
                dto.hora_fin,
                a.cant,
                undefined,
                tipoReserva,
              );
              if (!val.disponible) {
                todasDisponibles = false;
                break;
              }
            }

            if (todasDisponibles) {
              const idGrupo = `GRP_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
              const salasGrupoJson = asignaciones.map((a) => ({
                id_sala: a.sala.id_sala,
                codigo_sala: a.sala.codigo_sala,
                nombre: a.sala.nombre,
                capacidad: a.sala.cant_estudiantes,
                cant_asignada: a.cant,
              }));

              for (const a of asignaciones) {
                const r = this.reservaRepository.create({
                  id_sala: a.sala.id_sala,
                  codigo_docente: dto.codigo_docente,
                  id_materia: dto.id_materia,
                  fecha_reserva: fechaIso,
                  hora_inicio: dto.hora_inicio,
                  hora_fin: dto.hora_fin,
                  tema_practica: dto.tema_practica.trim(),
                  cant_estimada_alumnos: a.cant,
                  cant_total_alumnos: dto.cant_estimada_alumnos,
                  id_grupo_multisala: idGrupo,
                  salas_grupo: salasGrupoJson,
                  tipo_reserva: tipoReserva,
                  estado: EstadoReserva.PENDIENTE,
                  id_lote_recurrente: idLote,
                  editada: false,
                });
                const guardada = await this.reservaRepository.save(r);
                reservasCreadas.push(guardada);
              }
            }
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
        dias_semana: diasObjetivo,
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

    throw new ConflictException(
      'No se pudieron programar clases debido a conflictos de horario en el rango semestral',
    );
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

    const nuevaFecha = dto.fecha_reserva || reserva.fecha_reserva;
    const nuevaHoraInicio = dto.hora_inicio || reserva.hora_inicio;
    const nuevaHoraFin = dto.hora_fin || reserva.hora_fin;
    const nuevoTipo = dto.tipo_reserva || reserva.tipo_reserva;
    const nuevoTema = dto.tema_practica ? dto.tema_practica.trim() : reserva.tema_practica;
    const nuevaCantTotal = dto.cant_estimada_alumnos || reserva.cant_total_alumnos || reserva.cant_estimada_alumnos;

    // Obtener todas las reservas vinculadas si es un grupo multi-sala
    const reservasGrupo = reserva.id_grupo_multisala
      ? await this.reservaRepository.find({
          where: { id_grupo_multisala: reserva.id_grupo_multisala },
          relations: { sala: true },
        })
      : [reserva];

    const grupoIds = reservasGrupo.map((r) => r.id_reserva);

    // Determinar las salas seleccionadas/deseadas
    let idsSalasDeseadas: number[];
    if (dto.ids_salas && dto.ids_salas.length > 0) {
      idsSalasDeseadas = Array.from(new Set(dto.ids_salas.map(Number)));
    } else if (dto.id_sala) {
      idsSalasDeseadas = [Number(dto.id_sala)];
    } else {
      idsSalasDeseadas = [Number(reserva.id_sala)];
    }

    const salasDeseadas = await this.salaRepository.find({
      where: { id_sala: In(idsSalasDeseadas) },
    });

    if (salasDeseadas.length !== idsSalasDeseadas.length) {
      throw new NotFoundException('Una o más salas seleccionadas no existen en el sistema');
    }

    // Mantener el orden de idsSalasDeseadas
    salasDeseadas.sort(
      (a, b) => idsSalasDeseadas.indexOf(a.id_sala) - idsSalasDeseadas.indexOf(b.id_sala),
    );

    // Validar capacidad combinada total
    const capTotal = salasDeseadas.reduce(
      (acc, s) => acc + (s.cant_estudiantes || 0),
      0,
    );
    if (nuevaCantTotal > capTotal) {
      const salasNombres = salasDeseadas.map((s) => s.codigo_sala).join(' + ');
      throw new BadRequestException(
        `La cantidad estimada (${nuevaCantTotal} alumnos) excede la capacidad combinada de ${salasNombres} (${capTotal} puestos).`,
      );
    }

    // Reparto proporcional por sala
    let restante = nuevaCantTotal;
    const asignaciones: { sala: LaboratorioSala; cant: number }[] = [];
    for (let i = 0; i < salasDeseadas.length; i++) {
      const s = salasDeseadas[i];
      if (i === salasDeseadas.length - 1) {
        asignaciones.push({
          sala: s,
          cant: Math.min(s.cant_estudiantes, Math.max(1, restante)),
        });
      } else {
        const prop = Math.round(nuevaCantTotal * (s.cant_estudiantes / capTotal));
        const asignada = Math.min(
          s.cant_estudiantes,
          Math.max(1, Math.min(restante - (salasDeseadas.length - 1 - i), prop)),
        );
        asignaciones.push({ sala: s, cant: asignada });
        restante -= asignada;
      }
    }

    // Validar disponibilidad horaria de cada sala
    for (const a of asignaciones) {
      const val = await this.algoritmoService.validarDisponibilidad(
        a.sala.id_sala,
        nuevaFecha,
        nuevaHoraInicio,
        nuevaHoraFin,
        a.cant,
        grupoIds,
        nuevoTipo,
      );

      if (!val.disponible) {
        throw new ConflictException(
          `Conflicto en la sala ${a.sala.codigo_sala}: ${val.mensaje}`,
        );
      }
    }

    // Reglas de estado y notas de edición
    let nuevoEstado = reserva.estado;
    let nuevaEditada = true;
    let nuevaObsResolucion = reserva.obs_resolucion;
    let nuevaNotificacionDocente = reserva.notificacion_docente;

    if (!esAdmin) {
      // Docente edita: vuelve a PENDIENTE para revisión de Jefatura y marca editada
      nuevoEstado = EstadoReserva.PENDIENTE;
      nuevaObsResolucion = `Modificada por el docente solicitante: ${dto.obs_edicion || 'Horario/sala actualizada'}`;
    } else {
      // Administrador edita: mantiene aprobación previa pero notifica al docente
      if (dto.obs_edicion) {
        nuevaNotificacionDocente = dto.obs_edicion.trim();
      }
    }

    // Actualizar registros en base de datos
    if (asignaciones.length === 1) {
      // Caso A: Se asigna una sola sala (o se reduce de multi-sala a individual)
      const asigUnica = asignaciones[0];

      // Eliminar reservas secundarias si antes era multi-sala
      for (const rg of reservasGrupo) {
        if (rg.id_reserva !== reserva.id_reserva) {
          await this.reservaRepository.delete(rg.id_reserva);
        }
      }

      // Actualizar registro principal de forma atómica en BD
      await this.reservaRepository.update(reserva.id_reserva, {
        id_sala: asigUnica.sala.id_sala,
        id_grupo_multisala: null,
        salas_grupo: null,
        cant_estimada_alumnos: asigUnica.cant,
        cant_total_alumnos: nuevaCantTotal,
        fecha_reserva: nuevaFecha,
        hora_inicio: nuevaHoraInicio,
        hora_fin: nuevaHoraFin,
        tema_practica: nuevoTema,
        tipo_reserva: nuevoTipo,
        estado: nuevoEstado,
        editada: nuevaEditada,
        obs_resolucion: nuevaObsResolucion,
        notificacion_docente: nuevaNotificacionDocente,
      });
    } else {
      // Caso B: Multi-sala (2 o más salas)
      const idGrupo =
        reserva.id_grupo_multisala ||
        `GRP_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const salasGrupoJson = asignaciones.map((a) => ({
        id_sala: a.sala.id_sala,
        codigo_sala: a.sala.codigo_sala,
        nombre: a.sala.nombre,
        capacidad: a.sala.cant_estudiantes,
        cant_asignada: a.cant,
      }));

      // Actualizar la reserva primaria con la primera sala
      await this.reservaRepository.update(reserva.id_reserva, {
        id_sala: asignaciones[0].sala.id_sala,
        id_grupo_multisala: idGrupo,
        salas_grupo: salasGrupoJson,
        cant_estimada_alumnos: asignaciones[0].cant,
        cant_total_alumnos: nuevaCantTotal,
        fecha_reserva: nuevaFecha,
        hora_inicio: nuevaHoraInicio,
        hora_fin: nuevaHoraFin,
        tema_practica: nuevoTema,
        tipo_reserva: nuevoTipo,
        estado: nuevoEstado,
        editada: nuevaEditada,
        obs_resolucion: nuevaObsResolucion,
        notificacion_docente: nuevaNotificacionDocente,
      });

      // Gestionar salas secundarias (actualizar existentes o crear nuevas o eliminar excedentes)
      const secundariasExistentes = reservasGrupo.filter(
        (rg) => rg.id_reserva !== reserva.id_reserva,
      );
      const asignacionesSecundarias = asignaciones.slice(1);

      for (
        let i = 0;
        i < Math.max(secundariasExistentes.length, asignacionesSecundarias.length);
        i++
      ) {
        if (i < asignacionesSecundarias.length && i < secundariasExistentes.length) {
          // Actualizar secundaria existente
          const asig = asignacionesSecundarias[i];
          await this.reservaRepository.update(secundariasExistentes[i].id_reserva, {
            id_sala: asig.sala.id_sala,
            id_grupo_multisala: idGrupo,
            salas_grupo: salasGrupoJson,
            cant_estimada_alumnos: asig.cant,
            cant_total_alumnos: nuevaCantTotal,
            fecha_reserva: nuevaFecha,
            hora_inicio: nuevaHoraInicio,
            hora_fin: nuevaHoraFin,
            tema_practica: nuevoTema,
            tipo_reserva: nuevoTipo,
            estado: nuevoEstado,
            editada: nuevaEditada,
            obs_resolucion: nuevaObsResolucion,
            notificacion_docente: nuevaNotificacionDocente,
          });
        } else if (
          i < asignacionesSecundarias.length &&
          i >= secundariasExistentes.length
        ) {
          // Crear nueva secundaria
          const asig = asignacionesSecundarias[i];
          const nuevaSec = this.reservaRepository.create({
            id_sala: asig.sala.id_sala,
            codigo_docente: reserva.codigo_docente,
            id_materia: reserva.id_materia,
            fecha_reserva: nuevaFecha,
            hora_inicio: nuevaHoraInicio,
            hora_fin: nuevaHoraFin,
            tema_practica: nuevoTema,
            cant_estimada_alumnos: asig.cant,
            cant_total_alumnos: nuevaCantTotal,
            id_grupo_multisala: idGrupo,
            salas_grupo: salasGrupoJson,
            tipo_reserva: nuevoTipo,
            estado: nuevoEstado,
            editada: nuevaEditada,
            obs_resolucion: nuevaObsResolucion,
            notificacion_docente: nuevaNotificacionDocente,
            id_usuario_administrador: reserva.id_usuario_administrador,
          });
          await this.reservaRepository.save(nuevaSec);
        } else if (
          i >= asignacionesSecundarias.length &&
          i < secundariasExistentes.length
        ) {
          // Eliminar sobrante
          await this.reservaRepository.delete(secundariasExistentes[i].id_reserva);
        }
      }
    }

    // Auditoría
    await this.auditoriaService.registrar({
      id_usuario: currentUser?.id_usuario,
      correo_usuario: currentUser?.correo || currentUser?.correo_institucional,
      tabla_afectada: 'reserva_sala',
      id_registro_afectado: String(reserva.id_reserva),
      accion: 'UPDATE',
      valores_nuevos: {
        id_sala: asignaciones[0].sala.id_sala,
        ids_salas: idsSalasDeseadas,
        fecha_reserva: nuevaFecha,
        hora_inicio: nuevaHoraInicio,
        hora_fin: nuevaHoraFin,
        editada: nuevaEditada,
        estado: nuevoEstado,
        obs_edicion: dto.obs_edicion,
      },
      ip_cliente: ip,
    });

    // Emisión WebSocket
    this.reservasGateway.emitirActualizacionReservas({
      accion: 'EDITADA',
      id_reserva: reserva.id_reserva,
      id_sala: asignaciones[0].sala.id_sala,
      estado: nuevoEstado,
      editada: nuevaEditada,
    });

    return this.obtenerPorId(reserva.id_reserva);
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

    const reservasGrupo = reserva.id_grupo_multisala
      ? await this.reservaRepository.find({
          where: { id_grupo_multisala: reserva.id_grupo_multisala },
        })
      : [reserva];

    if (dto.accion === AccionResolucionReserva.APROBAR) {
      for (const r of reservasGrupo) {
        const validacion = await this.algoritmoService.validarDisponibilidad(
          r.id_sala,
          r.fecha_reserva,
          r.hora_inicio,
          r.hora_fin,
          r.cant_estimada_alumnos,
          r.id_reserva,
          r.tipo_reserva,
        );

        if (!validacion.disponible) {
          throw new ConflictException(
            `Existe un conflicto horario insalvable en una de las salas: ${validacion.mensaje}`,
          );
        }

        // Si es un examen con prioridad académica sobre una clase desplazable, desplazarla
        if (
          r.tipo_reserva === TipoReserva.EXAMEN &&
          validacion.reservaConflicto &&
          validacion.reservaConflicto.esDesplazable
        ) {
          const claseId = validacion.reservaConflicto.id_reserva;
          await this.reservaRepository.update(claseId, {
            estado: EstadoReserva.PENDIENTE,
            notificacion_docente: `Su clase del día ${r.fecha_reserva} (${r.hora_inicio.slice(0, 5)}-${r.hora_fin.slice(0, 5)}) fue reprogramada por aplicación prioritaria de Examen.`,
            editada: true,
          });
        }
      }

      for (const r of reservasGrupo) {
        const datosAnteriores = {
          estado: r.estado,
          obs_resolucion: r.obs_resolucion,
          id_usuario_administrador: r.id_usuario_administrador,
          editada: r.editada,
        };

        r.estado = EstadoReserva.APROBADA;
        r.obs_resolucion = dto.obs_resolucion?.trim() || 'Aprobada por Jefatura';
        r.editada = false;
        r.id_usuario_administrador = currentUser?.id_usuario;

        const actualizada = await this.reservaRepository.save(r);

        await this.auditoriaService.registrar({
          id_usuario: currentUser?.id_usuario,
          correo_usuario: currentUser?.correo || currentUser?.correo_institucional,
          tabla_afectada: 'reserva_sala',
          id_registro_afectado: String(r.id_reserva),
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

        this.reservasGateway.emitirActualizacionReservas({
          accion: 'DICTAMINADA',
          id_reserva: actualizada.id_reserva,
          estado: actualizada.estado,
          id_sala: actualizada.id_sala,
        });
      }

      // Si se solicitó aprobación masiva para todas las clases recurrentes pendientes
      if (dto.aprobar_todas_recurrentes && reserva.tipo_reserva === TipoReserva.CLASE) {
        let otrasPendientes: ReservaSala[] = [];
        if (reserva.id_lote_recurrente) {
          otrasPendientes = await this.reservaRepository.find({
            where: {
              id_lote_recurrente: reserva.id_lote_recurrente,
              estado: EstadoReserva.PENDIENTE,
              tipo_reserva: TipoReserva.CLASE,
            },
          });
        } else {
          otrasPendientes = await this.reservaRepository.find({
            where: {
              codigo_docente: reserva.codigo_docente,
              id_materia: reserva.id_materia,
              tipo_reserva: TipoReserva.CLASE,
              estado: EstadoReserva.PENDIENTE,
            },
          });
        }

        const idsGrupo = new Set(reservasGrupo.map((rg) => rg.id_reserva));
        otrasPendientes = otrasPendientes.filter((op) => !idsGrupo.has(op.id_reserva));

        for (const op of otrasPendientes) {
          try {
            const val = await this.algoritmoService.validarDisponibilidad(
              op.id_sala,
              op.fecha_reserva,
              op.hora_inicio,
              op.hora_fin,
              op.cant_estimada_alumnos,
              op.id_reserva,
              op.tipo_reserva,
            );

            if (val.disponible) {
              const prev = {
                estado: op.estado,
                obs_resolucion: op.obs_resolucion,
                id_usuario_administrador: op.id_usuario_administrador,
                editada: op.editada,
              };

              op.estado = EstadoReserva.APROBADA;
              op.obs_resolucion = dto.obs_resolucion?.trim()
                ? `${dto.obs_resolucion.trim()} (Aprobación en lote semestral)`
                : 'Aprobación en lote de clases recurrentes';
              op.editada = false;
              op.id_usuario_administrador = currentUser?.id_usuario;

              await this.reservaRepository.save(op);

              await this.auditoriaService.registrar({
                id_usuario: currentUser?.id_usuario,
                correo_usuario: currentUser?.correo || currentUser?.correo_institucional,
                tabla_afectada: 'reserva_sala',
                id_registro_afectado: String(op.id_reserva),
                accion: 'UPDATE',
                valores_anteriores: prev,
                valores_nuevos: {
                  estado: op.estado,
                  obs_resolucion: op.obs_resolucion,
                  id_usuario_administrador: op.id_usuario_administrador,
                  editada: false,
                },
                ip_cliente: ip,
              });

              this.reservasGateway.emitirActualizacionReservas({
                accion: 'DICTAMINADA',
                id_reserva: op.id_reserva,
                estado: op.estado,
                id_sala: op.id_sala,
              });
            }
          } catch (err: any) {
            this.logger.warn(
              `Omisión de aprobación automática para reserva #${op.id_reserva}: ${err?.message}`,
            );
          }
        }
      }
    } else {
      if (!dto.obs_resolucion || dto.obs_resolucion.trim() === '') {
        throw new BadRequestException(
          'Debe justificar obligatoriamente el motivo del rechazo de la solicitud',
        );
      }

      for (const r of reservasGrupo) {
        const datosAnteriores = {
          estado: r.estado,
          obs_resolucion: r.obs_resolucion,
          id_usuario_administrador: r.id_usuario_administrador,
          editada: r.editada,
        };

        r.estado = EstadoReserva.RECHAZADA;
        r.obs_resolucion = dto.obs_resolucion.trim();
        r.editada = false;
        r.id_usuario_administrador = currentUser?.id_usuario;

        const actualizada = await this.reservaRepository.save(r);

        await this.auditoriaService.registrar({
          id_usuario: currentUser?.id_usuario,
          correo_usuario: currentUser?.correo || currentUser?.correo_institucional,
          tabla_afectada: 'reserva_sala',
          id_registro_afectado: String(r.id_reserva),
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

        this.reservasGateway.emitirActualizacionReservas({
          accion: 'DICTAMINADA',
          id_reserva: actualizada.id_reserva,
          estado: actualizada.estado,
          id_sala: actualizada.id_sala,
        });
      }
    }

    return this.obtenerPorId(reserva.id_reserva);
  }

  /**
   * Marcar aviso de modificación o notificación de reserva como leído
   */
  async marcarLeida(
    id_reserva: number,
    currentUser: any,
    ip: string,
  ): Promise<ReservaSala> {
    const reserva = await this.obtenerPorId(id_reserva);
    const idGrupo = reserva.id_grupo_multisala;

    if (idGrupo) {
      await this.reservaRepository.update(
        { id_grupo_multisala: idGrupo },
        { editada: false, notificacion_docente: null },
      );
    } else {
      await this.reservaRepository.update(id_reserva, {
        editada: false,
        notificacion_docente: null,
      });
    }

    this.reservasGateway.emitirActualizacionReservas({
      accion: 'LEIDA',
      id_reserva: reserva.id_reserva,
      id_sala: reserva.id_sala,
    });

    return this.obtenerPorId(id_reserva);
  }

  /**
   * CU19: Cancelar reserva de aula (Docente titular o Administrador)
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

    // Validación de pertenencia: Solo el docente titular o administrador puede cancelar
    if (!esAdmin && Number(reserva.docente.id_usuario) !== Number(currentUser?.id_usuario)) {
      throw new ForbiddenException(
        'Solo el docente titular de la solicitud o un Administrador pueden cancelar la reserva',
      );
    }

    const reservasGrupo = reserva.id_grupo_multisala
      ? await this.reservaRepository.find({
          where: { id_grupo_multisala: reserva.id_grupo_multisala },
        })
      : [reserva];

    const actor = esAdmin ? 'el Administrador' : 'el docente titular';
    const notaCancelacion = `Cancelada por ${actor}: ${motivo ? motivo.trim() : 'Sin motivo especificado'}`;

    for (const r of reservasGrupo) {
      const datosAnteriores = {
        estado: r.estado,
        obs_resolucion: r.obs_resolucion,
      };

      r.estado = EstadoReserva.CANCELADA;
      r.obs_resolucion = r.obs_resolucion
        ? `${r.obs_resolucion} | ${notaCancelacion}`
        : notaCancelacion;

      const actualizada = await this.reservaRepository.save(r);

      await this.auditoriaService.registrar({
        id_usuario: currentUser?.id_usuario,
        correo_usuario: currentUser?.correo || currentUser?.correo_institucional,
        tabla_afectada: 'reserva_sala',
        id_registro_afectado: String(r.id_reserva),
        accion: 'UPDATE',
        valores_anteriores: datosAnteriores,
        valores_nuevos: {
          estado: actualizada.estado,
          obs_resolucion: actualizada.obs_resolucion,
        },
        ip_cliente: ip,
      });

      this.reservasGateway.emitirActualizacionReservas({
        accion: 'CANCELADA',
        id_reserva: actualizada.id_reserva,
        id_sala: actualizada.id_sala,
        estado: EstadoReserva.CANCELADA,
      });
    }

    return this.obtenerPorId(reserva.id_reserva);
  }
}
