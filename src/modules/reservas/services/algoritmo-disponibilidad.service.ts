import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReservaSala, EstadoReserva, TipoReserva } from '../entities/reserva-sala.entity';
import { LaboratorioSala } from '../../infraestructura/entities/laboratorio-sala.entity';

export interface ResultadoValidacionDisponibilidad {
  disponible: boolean;
  mensaje: string;
  reservaConflicto?: {
    id_reserva: number;
    codigo_docente: string;
    docente_nombre?: string;
    materia_nombre?: string;
    hora_inicio: string;
    hora_fin: string;
    estado: string;
    tipo_reserva?: string;
    esDesplazable?: boolean;
  };
}

@Injectable()
export class AlgoritmoDisponibilidadService {
  constructor(
    @InjectRepository(ReservaSala)
    private readonly reservaRepository: Repository<ReservaSala>,
    @InjectRepository(LaboratorioSala)
    private readonly salaRepository: Repository<LaboratorioSala>,
  ) {}

  /**
   * Valida estrictamente la disponibilidad horaria de una sala (CU18).
   * Aplica teorema de colisión de intervalos: max(I_A, I_B) < min(F_A, F_B)
   * En SQL: (hora_inicio < :horaFin AND hora_fin > :horaInicio)
   * Prioriza EXÁMENES sobre CLASES ordinarias si se solicita un examen.
   */
  async validarDisponibilidad(
    id_sala: number,
    fecha_reserva: string,
    hora_inicio: string,
    hora_fin: string,
    cant_estimada_alumnos?: number,
    excluirIdReserva?: number,
    tipo_reserva?: TipoReserva,
    validarCapacidad: boolean = true,
  ): Promise<ResultadoValidacionDisponibilidad> {
    // 1. Verificar existencia y operatividad de la sala
    const sala = await this.salaRepository.findOne({ where: { id_sala } });
    if (!sala) {
      throw new NotFoundException(`La sala con ID ${id_sala} no existe`);
    }

    if (!sala.activo) {
      throw new BadRequestException(
        `La sala ${sala.codigo_sala} se encuentra inactiva`,
      );
    }

    if (sala.estado_operativo !== 'OPERATIVA') {
      throw new BadRequestException(
        `La sala ${sala.codigo_sala} no está operativa (Estado actual: ${sala.estado_operativo})`,
      );
    }

    // 2. Validar capacidad de la sala si se especifica y aplica validación individual
    if (validarCapacidad && cant_estimada_alumnos && cant_estimada_alumnos > sala.cant_estudiantes) {
      throw new BadRequestException(
        `La cantidad estimada (${cant_estimada_alumnos} alumnos) excede la capacidad de la sala ${sala.codigo_sala} (${sala.cant_estudiantes} puestos)`,
      );
    }

    // 3. Validar coherencia temporal y duración mínima (45 min)
    const minutosInicio = this.horaToMinutos(hora_inicio);
    const minutosFin = this.horaToMinutos(hora_fin);

    if (minutosFin <= minutosInicio) {
      throw new BadRequestException(
        'La hora de finalización debe ser estrictamente posterior a la hora de inicio',
      );
    }

    const duracion = minutosFin - minutosInicio;
    if (duracion < 45) {
      throw new BadRequestException(
        `La duración mínima de una reserva académica es de 45 minutos (duración solicitada: ${duracion} min)`,
      );
    }

    // 4. Validar que la fecha/hora no sea en el pasado
    this.validarNoEsPasado(fecha_reserva, hora_inicio);

    // 5. Query nativa / QueryBuilder para detección de solapamientos con reservas APROBADAS o EN_CURSO
    const qb = this.reservaRepository
      .createQueryBuilder('reserva')
      .leftJoinAndSelect('reserva.docente', 'docente')
      .leftJoinAndSelect('docente.usuario', 'usuario_docente')
      .leftJoinAndSelect('reserva.materia', 'materia')
      .where('reserva.id_sala = :id_sala', { id_sala })
      .andWhere('reserva.fecha_reserva = :fecha_reserva', { fecha_reserva })
      .andWhere('reserva.estado IN (:...estadosActivos)', {
        estadosActivos: [EstadoReserva.APROBADA, EstadoReserva.EN_CURSO],
      })
      .andWhere('(reserva.hora_inicio < :hora_fin AND reserva.hora_fin > :hora_inicio)', {
        hora_inicio,
        hora_fin,
      });

    if (excluirIdReserva) {
      qb.andWhere('reserva.id_reserva != :excluirIdReserva', {
        excluirIdReserva,
      });
    }

    const colisionAprobada = await qb.getOne();

    if (colisionAprobada) {
      const nombreDocente = colisionAprobada.docente?.usuario
        ? `${colisionAprobada.docente.usuario.nombres} ${colisionAprobada.docente.usuario.apellidos}`
        : colisionAprobada.codigo_docente;

      // Política de Prioridad Académica: Examen sobre Clase regular
      if (
        tipo_reserva === TipoReserva.EXAMEN &&
        colisionAprobada.tipo_reserva === TipoReserva.CLASE
      ) {
        return {
          disponible: true,
          mensaje: `Prioridad Académica Detectada: Existe una clase ordinaria de ${nombreDocente} (${colisionAprobada.materia?.sigla || ''} - ${colisionAprobada.materia?.nombre || 'Clase'}) en este turno. Al ser un EXAMEN, tiene prioridad. Al autorizarse el examen, el sistema notificará oportunamente al docente de la clase desplazada.`,
          reservaConflicto: {
            id_reserva: colisionAprobada.id_reserva,
            codigo_docente: colisionAprobada.codigo_docente,
            docente_nombre: nombreDocente,
            materia_nombre: colisionAprobada.materia?.nombre,
            hora_inicio: colisionAprobada.hora_inicio,
            hora_fin: colisionAprobada.hora_fin,
            estado: colisionAprobada.estado,
            tipo_reserva: colisionAprobada.tipo_reserva,
            esDesplazable: true,
          },
        };
      }

      return {
        disponible: false,
        mensaje: `Conflicto horario: La sala ${sala.codigo_sala} ya se encuentra reservada de ${colisionAprobada.hora_inicio} a ${colisionAprobada.hora_fin} por ${nombreDocente} (${colisionAprobada.materia?.nombre || 'Clase'}) [Tipo: ${colisionAprobada.tipo_reserva || 'CLASE'}]`,
        reservaConflicto: {
          id_reserva: colisionAprobada.id_reserva,
          codigo_docente: colisionAprobada.codigo_docente,
          docente_nombre: nombreDocente,
          materia_nombre: colisionAprobada.materia?.nombre,
          hora_inicio: colisionAprobada.hora_inicio,
          hora_fin: colisionAprobada.hora_fin,
          estado: colisionAprobada.estado,
          tipo_reserva: colisionAprobada.tipo_reserva,
          esDesplazable: false,
        },
      };
    }

    return {
      disponible: true,
      mensaje: `Horario plenamente disponible en la sala ${sala.codigo_sala} para la fecha ${fecha_reserva}`,
    };
  }

  /**
   * Convierte cadena "HH:mm" o "HH:mm:ss" a minutos enteros del día
   */
  private horaToMinutos(horaStr: string): number {
    const partes = horaStr.split(':').map((p) => parseInt(p, 10));
    const h = partes[0] || 0;
    const m = partes[1] || 0;
    return h * 60 + m;
  }

  /**
   * Garantiza que no se puedan solicitar reservas retroactivas
   */
  private validarNoEsPasado(fecha_reserva: string, hora_inicio: string): void {
    const ahora = new Date();
    const [año, mes, dia] = fecha_reserva.split('-').map((v) => parseInt(v, 10));
    const [h, m] = hora_inicio.split(':').map((v) => parseInt(v, 10));

    const fechaHoraSolicitada = new Date(año, mes - 1, dia, h, m, 0, 0);

    // Margen de gracia de 2 minutos para compensar pequeñas demoras de red
    const margenGracia = new Date(ahora.getTime() - 2 * 60 * 1000);

    if (fechaHoraSolicitada < margenGracia) {
      throw new BadRequestException(
        'No está permitido solicitar reservas académicas para fechas u horarios pasados',
      );
    }
  }
}
