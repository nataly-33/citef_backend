import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AveriaEquipo,
  EstadoAveria,
  GravedadAveria,
} from '../entities/averia-equipo.entity';
import { Computadora } from '../../infraestructura/entities/computadora.entity';
import { AsignacionSesion } from '../../ocupacion/entities/asignacion-sesion.entity';
import { JornadaTurno, EstadoJornada } from '../entities/jornada-turno.entity';
import { ReservaSala } from '../../reservas/entities/reserva-sala.entity';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { ReportarAveriaDto } from '../dto/reportar-averia.dto';
import { ActualizarAveriaDto } from '../dto/actualizar-averia.dto';
import { FiltroAveriasDto } from '../dto/filtro-averias.dto';

@Injectable()
export class AveriasService {
  constructor(
    @InjectRepository(AveriaEquipo)
    private readonly averiaRepo: Repository<AveriaEquipo>,
    @InjectRepository(Computadora)
    private readonly computadoraRepo: Repository<Computadora>,
    @InjectRepository(AsignacionSesion)
    private readonly sesionRepo: Repository<AsignacionSesion>,
    @InjectRepository(JornadaTurno)
    private readonly jornadaRepo: Repository<JornadaTurno>,
    @InjectRepository(ReservaSala)
    private readonly reservaRepo: Repository<ReservaSala>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * CU22: Reportar avería técnica en computadora vinculando contextualmente
   * al último estudiante o reserva académica y poniendo el equipo en mantenimiento.
   */
  async reportarAveria(
    dto: ReportarAveriaDto,
    idUsuarioReporta: number,
    ip?: string,
  ): Promise<AveriaEquipo> {
    const computadora = await this.computadoraRepo.findOne({
      where: { id_computadora: dto.id_computadora },
      relations: { sala: true },
    });

    if (!computadora) {
      throw new NotFoundException(
        `La computadora con ID ${dto.id_computadora} no existe`,
      );
    }

    // Identificar último estudiante si no viene especificado
    let registroEstudiante = dto.registro_ultimo_estudiante ?? null;
    if (!registroEstudiante) {
      const ultimaSesion = await this.sesionRepo.findOne({
        where: { id_computadora: dto.id_computadora },
        order: { fecha_hora_inicio: 'DESC' },
      });
      if (ultimaSesion) {
        registroEstudiante = ultimaSesion.registro_estudiante;
      }
    }

    // Vincular jornada activa si existe en la sala
    let idJornada = dto.id_jornada ?? null;
    let jornadaActiva: JornadaTurno | null = null;
    if (!idJornada) {
      jornadaActiva = await this.jornadaRepo.findOne({
        where: { id_sala: computadora.id_sala, estado: EstadoJornada.EN_CURSO },
      });
      if (jornadaActiva) {
        idJornada = jornadaActiva.id_jornada;
      }
    }

    // Vincular reserva si no viene especificada
    let idReserva = dto.id_reserva ?? null;
    if (!idReserva) {
      const hoy = new Date().toISOString().split('T')[0];
      const reservaHoy = await this.reservaRepo.findOne({
        where: { id_sala: computadora.id_sala, fecha_reserva: hoy },
        order: { hora_inicio: 'DESC' },
      });
      if (reservaHoy) {
        idReserva = reservaHoy.id_reserva;
      }
    }

    // Conmutar estado de la computadora a EN_MANTENIMIENTO
    computadora.estado_actual = 'EN_MANTENIMIENTO';
    await this.computadoraRepo.save(computadora);

    const nuevaAveria = this.averiaRepo.create({
      id_computadora: dto.id_computadora,
      id_sala: computadora.id_sala,
      id_usuario_reporta: idUsuarioReporta,
      registro_ultimo_estudiante: registroEstudiante,
      id_reserva: idReserva,
      id_jornada: idJornada,
      tipo_falla: dto.tipo_falla,
      descrip_falla: dto.descrip_falla,
      gravedad: dto.gravedad ?? GravedadAveria.MEDIA,
      estado: EstadoAveria.PENDIENTE_REVISION,
      fecha_reporte: new Date(),
      solucion_tecnica: null,
      fecha_solucion: null,
    });

    const guardada = await this.averiaRepo.save(nuevaAveria);

    // Incrementar contador de averías en la jornada activa
    if (jornadaActiva) {
      jornadaActiva.cant_averias_reportadas =
        (jornadaActiva.cant_averias_reportadas || 0) + 1;
      await this.jornadaRepo.save(jornadaActiva);
    }

    await this.auditoriaService.registrar({
      id_usuario: idUsuarioReporta,
      accion: 'REPORTAR_AVERIA',
      tabla_afectada: 'averia_equipo',
      id_registro_afectado: String(guardada.id_averia),
      valores_nuevos: guardada as any,
      ip_cliente: ip,
    });

    return guardada;
  }

  /**
   * CU22: Endpoint de ayuda contextual que retorna el último estudiante de
   * AsignacionSesion o reserva académica para prellenar en el formulario del frontend.
   */
  async getUltimoUsuarioComputadora(idComputadora: number) {
    const pc = await this.computadoraRepo.findOne({
      where: { id_computadora: idComputadora },
      relations: { sala: true },
    });

    if (!pc) {
      throw new NotFoundException(
        `La computadora con ID ${idComputadora} no existe`,
      );
    }

    const ultimaSesion = await this.sesionRepo.findOne({
      where: { id_computadora: idComputadora },
      order: { fecha_hora_inicio: 'DESC' },
      relations: { estudiante: { carrera: true }, motivo: true },
    });

    let reservaContextual: ReservaSala | null = null;
    if (pc.id_sala) {
      const hoy = new Date().toISOString().split('T')[0];
      reservaContextual = await this.reservaRepo.findOne({
        where: { id_sala: pc.id_sala, fecha_reserva: hoy },
        relations: { docente: true, materia: true },
        order: { hora_inicio: 'DESC' },
      });
    }

    return {
      computadora: pc,
      ultimo_estudiante: ultimaSesion?.estudiante ?? null,
      ultima_sesion: ultimaSesion ?? null,
      reserva_contextual: reservaContextual ?? null,
    };
  }

  /**
   * Cambiar estado de avería técnica y restaurar la máquina si está REPARADO
   */
  async cambiarEstadoAveria(
    idAveria: number,
    dto: ActualizarAveriaDto,
    idUsuario: number,
    ip?: string,
  ): Promise<AveriaEquipo> {
    const averia = await this.averiaRepo.findOne({
      where: { id_averia: idAveria },
      relations: { computadora: true },
    });

    if (!averia) {
      throw new NotFoundException(`La avería con ID #${idAveria} no existe`);
    }

    const valoresAnteriores = { ...averia };

    averia.estado = dto.estado;
    if (dto.solucion_tecnica !== undefined) {
      averia.solucion_tecnica = dto.solucion_tecnica;
    }

    if (dto.estado === EstadoAveria.REPARADO) {
      averia.fecha_solucion = new Date();
      if (averia.computadora) {
        averia.computadora.estado_actual = 'DISPONIBLE';
        await this.computadoraRepo.save(averia.computadora);
      }
    }

    const actualizada = await this.averiaRepo.save(averia);

    await this.auditoriaService.registrar({
      id_usuario: idUsuario,
      accion: 'ACTUALIZAR_ESTADO_AVERIA',
      tabla_afectada: 'averia_equipo',
      id_registro_afectado: String(actualizada.id_averia),
      valores_anteriores: valoresAnteriores,
      valores_nuevos: actualizada as any,
      ip_cliente: ip,
    });

    return actualizada;
  }

  /**
   * Listar averías técnicas con paginación y filtros
   */
  async getAverias(params: FiltroAveriasDto) {
    const limite = params.limite || params.limit || 15;
    const pagina = params.pagina || params.page || 1;
    const skip = (pagina - 1) * limite;

    const qb = this.averiaRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.computadora', 'computadora')
      .leftJoinAndSelect('a.sala', 'sala')
      .leftJoinAndSelect('a.usuario_reporta', 'usuario_reporta')
      .leftJoinAndSelect('a.ultimo_estudiante', 'ultimo_estudiante')
      .leftJoinAndSelect('a.reserva', 'reserva')
      .orderBy('a.fecha_reporte', 'DESC')
      .take(limite)
      .skip(skip);

    if (params.id_sala) {
      qb.andWhere('a.id_sala = :idSala', { idSala: params.id_sala });
    }
    if (params.id_computadora) {
      qb.andWhere('a.id_computadora = :idPc', { idPc: params.id_computadora });
    }
    if (params.gravedad && params.gravedad !== 'TODOS') {
      qb.andWhere('a.gravedad = :gravedad', { gravedad: params.gravedad });
    }
    if (params.estado && params.estado !== 'TODOS') {
      qb.andWhere('a.estado = :estado', { estado: params.estado });
    }
    if (params.fecha) {
      qb.andWhere('CAST(a.fecha_reporte AS date) = :fecha', {
        fecha: params.fecha,
      });
    }
    if (params.busqueda) {
      qb.andWhere(
        '(a.descrip_falla ILIKE :busqueda OR computadora.codigo_equipo ILIKE :busqueda OR sala.nombre ILIKE :busqueda OR sala.codigo_sala ILIKE :busqueda)',
        { busqueda: `%${params.busqueda}%` },
      );
    }

    const [items, total] = await qb.getManyAndCount();

    const sanitizedItems = items.map((av) => {
      if (av.usuario_reporta) {
        const { password_hash: _password_hash, ...uRest } = av.usuario_reporta;
        av.usuario_reporta = uRest as any;
      }
      return av;
    });

    return {
      total,
      pagina,
      limite,
      paginas_totales: Math.ceil(total / limite),
      items: sanitizedItems,
      data: sanitizedItems,
    };
  }

  /**
   * Obtener detalle de avería por ID
   */
  async getAveriaById(idAveria: number): Promise<AveriaEquipo> {
    const averia = await this.averiaRepo.findOne({
      where: { id_averia: idAveria },
      relations: {
        computadora: true,
        sala: true,
        usuario_reporta: true,
        ultimo_estudiante: true,
        reserva: true,
        jornada: true,
      },
    });

    if (!averia) {
      throw new NotFoundException(`La avería #${idAveria} no existe`);
    }

    if (averia.usuario_reporta) {
      const { password_hash: _password_hash, ...uRest } = averia.usuario_reporta;
      averia.usuario_reporta = uRest as any;
    }

    return averia;
  }
}
