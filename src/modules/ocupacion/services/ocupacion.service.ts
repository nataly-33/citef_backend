import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { LaboratorioSala } from '../../infraestructura/entities/laboratorio-sala.entity';
import { Computadora } from '../../infraestructura/entities/computadora.entity';
import { Estudiante } from '../entities/estudiante.entity';
import { AsignacionSesion } from '../entities/asignacion-sesion.entity';
import { ColaEsperaSala } from '../entities/cola-espera-sala.entity';
import { MotivoUso } from '../../catalogos/entities/motivo-uso.entity';
import { AsignarEquipoDto } from '../dto/asignar-equipo.dto';
import { LiberarEquipoDto } from '../dto/liberar-equipo.dto';
import { OcupacionGateway } from '../gateways/ocupacion.gateway';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { ColasEsperaService } from './colas-espera.service';

@Injectable()
export class OcupacionService {
  private readonly logger = new Logger(OcupacionService.name);

  constructor(
    @InjectRepository(LaboratorioSala)
    private readonly salaRepo: Repository<LaboratorioSala>,
    @InjectRepository(Computadora)
    private readonly computadoraRepo: Repository<Computadora>,
    @InjectRepository(Estudiante)
    private readonly estudianteRepo: Repository<Estudiante>,
    @InjectRepository(AsignacionSesion)
    private readonly sesionRepo: Repository<AsignacionSesion>,
    @InjectRepository(ColaEsperaSala)
    private readonly colaRepo: Repository<ColaEsperaSala>,
    @InjectRepository(MotivoUso)
    private readonly motivoRepo: Repository<MotivoUso>,
    private readonly gateway: OcupacionGateway,
    private readonly auditoriaService: AuditoriaService,
    private readonly colasEsperaService: ColasEsperaService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Obtiene la vista en tiempo real de una sala con computadoras, sesiones y métricas
   */
  async obtenerEstadoSala(idSala: number) {
    const sala = await this.salaRepo.findOne({
      where: { id_sala: idSala },
    });

    if (!sala) {
      throw new NotFoundException(`La sala con ID ${idSala} no existe`);
    }

    const computadoras = await this.computadoraRepo.find({
      where: { id_sala: idSala, activo: true },
      order: { posicion_fila: 'ASC', posicion_columna: 'ASC' },
      relations: { perifericos: true },
    });

    // Cargar sesiones activas
    const sesionesActivas = await this.sesionRepo.find({
      where: {
        computadora: { id_sala: idSala },
        estado: 'EN_CURSO',
      },
      relations: {
        estudiante: { carrera: true },
        motivo: true,
        auxiliar: true,
      },
    });

    const sesionMap = new Map<number, AsignacionSesion>();
    for (const s of sesionesActivas) {
      sesionMap.set(Number(s.id_computadora), s);
    }

    const ahora = new Date().getTime();

    // Mapear computadoras con datos de sesión viva
    const puestosConDetalle = computadoras.map((pc) => {
      const sesion = sesionMap.get(Number(pc.id_computadora));
      let minutosTranscurridos = 0;
      if (sesion && sesion.fecha_hora_inicio) {
        minutosTranscurridos = Math.max(
          1,
          Math.floor((ahora - new Date(sesion.fecha_hora_inicio).getTime()) / 60000),
        );
      }

      return {
        id_computadora: Number(pc.id_computadora),
        codigo_equipo: pc.codigo_equipo,
        posicion_fila: pc.posicion_fila,
        posicion_columna: pc.posicion_columna,
        estado_actual: pc.estado_actual,
        maquina_docente: pc.maquina_docente,
        ip_red: pc.ip_red,
        horas_uso_acumuladas: Number(pc.horas_uso_acumuladas),
        perifericos_conteo: pc.perifericos?.length || 0,
        sesion_activa: sesion
          ? {
              id_asignacion: Number(sesion.id_asignacion),
              registro_estudiante: sesion.registro_estudiante,
              estudiante_nombres: `${sesion.estudiante?.nombres || ''} ${sesion.estudiante?.apellidos || ''}`.trim(),
              carrera_nombre: sesion.estudiante?.carrera?.nombre || 'General',
              motivo_descrip: sesion.motivo?.descrip || 'Práctica',
              auxiliar_nombre: sesion.auxiliar ? `${sesion.auxiliar.nombres} ${sesion.auxiliar.apellidos}`.trim() : 'Auxiliar',
              fecha_hora_inicio: sesion.fecha_hora_inicio,
              minutos_transcurridos: minutosTranscurridos,
              asignacion_automatica: sesion.asignacion_automatica,
            }
          : null,
      };
    });

    // Puestos de estudiantes (excluyendo máquina docente de las métricas)
    const puestosAlumnos = puestosConDetalle.filter((p) => !p.maquina_docente);
    const totalPuestos = puestosAlumnos.length;
    const disponibles = puestosAlumnos.filter((p) => p.estado_actual === 'DISPONIBLE').length;
    const ocupadas = puestosAlumnos.filter((p) => p.estado_actual === 'OCUPADA').length;
    const reservadas = puestosAlumnos.filter((p) => p.estado_actual === 'RESERVADA').length;
    const mantenimiento = puestosAlumnos.filter((p) => p.estado_actual === 'EN_MANTENIMIENTO').length;

    const porcentajeOcupacion = totalPuestos > 0 ? Math.round((ocupadas / totalPuestos) * 100) : 0;
    const saturada = porcentajeOcupacion >= 90;

    const colaPendiente = await this.colaRepo.count({
      where: { id_sala: idSala, estado_cola: 'EN_ESPERA' },
    });

    const wqEstimado = this.colasEsperaService.calcularTiempoEsperaEstimado(
      totalPuestos,
      colaPendiente,
    );

    return {
      sala: {
        id_sala: sala.id_sala,
        codigo_sala: sala.codigo_sala,
        nombre: sala.nombre,
        piso: sala.piso,
        cant_estudiantes: sala.cant_estudiantes,
        filas_cuadricula: sala.filas_cuadricula,
        columnas_cuadricula: sala.columnas_cuadricula,
        estado_operativo: sala.estado_operativo,
      },
      kpis: {
        total_puestos: totalPuestos,
        disponibles,
        ocupadas,
        reservadas,
        mantenimiento,
        porcentaje_ocupacion: porcentajeOcupacion,
        saturada,
        cola_pendiente_conteo: colaPendiente,
        wq_estimado_min: wqEstimado,
      },
      computadoras: puestosConDetalle,
    };
  }

  /**
   * Sugiere la mejor computadora disponible en la sala balanceando horas de uso (menor uso primero)
   */
  async sugerirEquipoBalanceado(idSala: number) {
    const pc = await this.computadoraRepo
      .createQueryBuilder('c')
      .where('c.id_sala = :idSala', { idSala })
      .andWhere('c.activo = true')
      .andWhere('c.maquina_docente = false')
      .andWhere("c.estado_actual = 'DISPONIBLE'")
      .orderBy('c.horas_uso_acumuladas', 'ASC')
      .addOrderBy('c.codigo_equipo', 'ASC')
      .getOne();

    return pc;
  }

  /**
   * Asigna un puesto de cómputo a un estudiante (manual o balanceado)
   */
  async asignarEquipo(dto: AsignarEquipoDto, idUsuarioAuxiliar: number, ip?: string) {
    // 1. Validar estudiante
    const estudiante = await this.estudianteRepo.findOne({
      where: { registro: dto.registro_estudiante.trim() },
    });

    if (!estudiante) {
      throw new NotFoundException(`El estudiante con registro ${dto.registro_estudiante} no se encuentra registrado en el sistema`);
    }

    if (estudiante.sancionado) {
      throw new BadRequestException(
        `El estudiante presenta una sanción o investigación técnica pendiente: ${estudiante.motivo_sancion || 'Consulte en administración'}`,
      );
    }

    // 2. Validar que no tenga doble sesión activa
    const sesionPrevia = await this.sesionRepo.findOne({
      where: {
        registro_estudiante: estudiante.registro,
        estado: 'EN_CURSO',
      },
      relations: { computadora: { sala: true } },
    });

    if (sesionPrevia) {
      throw new ConflictException(
        `El estudiante ya cuenta con una sesión activa en la máquina ${sesionPrevia.computadora?.codigo_equipo || ''} (${sesionPrevia.computadora?.sala?.codigo_sala || ''}). Debe liberarla antes de una nueva asignación.`,
      );
    }

    // 3. Determinar equipo (manual vs automático)
    let equipoDestino: Computadora | null = null;
    const esAutomatica = !!dto.asignacion_automatica || !dto.id_computadora;

    if (esAutomatica) {
      equipoDestino = await this.sugerirEquipoBalanceado(dto.id_sala);
      if (!equipoDestino) {
        throw new BadRequestException('No hay puestos de cómputo disponibles en esta sala');
      }
    } else {
      equipoDestino = await this.computadoraRepo.findOne({
        where: { id_computadora: dto.id_computadora, id_sala: dto.id_sala, activo: true },
      });

      if (!equipoDestino) {
        throw new NotFoundException('La computadora seleccionada no existe en este laboratorio');
      }

      if (equipoDestino.maquina_docente) {
        throw new BadRequestException('La estación docente no puede asignarse a sesiones de alumnos libres');
      }

      if (equipoDestino.estado_actual !== 'DISPONIBLE') {
        throw new ConflictException('El equipo acaba de ser asignado por otro operador o no se encuentra disponible');
      }
    }

    // 4. Transacción atómica
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Bloqueo pesimista sobre la computadora
      const pcBloqueada = await queryRunner.manager.findOne(Computadora, {
        where: { id_computadora: equipoDestino.id_computadora },
        lock: { mode: 'pessimistic_write' },
      });

      if (!pcBloqueada || pcBloqueada.estado_actual !== 'DISPONIBLE') {
        throw new ConflictException('El puesto de cómputo no se encuentra disponible en este instante');
      }

      // Actualizar estado de computadora
      pcBloqueada.estado_actual = 'OCUPADA';
      await queryRunner.manager.save(pcBloqueada);

      // Crear sesión de uso
      const nuevaSesion = queryRunner.manager.create(AsignacionSesion, {
        id_computadora: pcBloqueada.id_computadora,
        registro_estudiante: estudiante.registro,
        id_motivo: dto.id_motivo,
        id_usuario_auxiliar: idUsuarioAuxiliar,
        fecha_hora_inicio: new Date(),
        asignacion_automatica: esAutomatica,
        observaciones: dto.observaciones || null,
        estado: 'EN_CURSO',
      });
      const sesionGuardada = await queryRunner.manager.save(nuevaSesion);

      // Si el estudiante estaba en cola de espera de esta sala, marcarlo como atendido
      const enCola = await queryRunner.manager.findOne(ColaEsperaSala, {
        where: {
          id_sala: dto.id_sala,
          registro_estudiante: estudiante.registro,
          estado_cola: 'EN_ESPERA',
        },
      });

      if (enCola) {
        const ahora = new Date();
        const esperaReal = Math.max(
          0,
          Math.round(((ahora.getTime() - new Date(enCola.fecha_hora_llegada).getTime()) / 60000) * 10) / 10,
        );
        enCola.estado_cola = 'ATENDIDO';
        enCola.fecha_hora_atencion = ahora;
        enCola.tiempo_espera_real_min = esperaReal;
        await queryRunner.manager.save(enCola);
      }

      await queryRunner.commitTransaction();

      // Auditoría forense
      await this.auditoriaService.registrar({
        id_usuario: idUsuarioAuxiliar,
        accion: 'ASIGNAR_EQUIPO_COMPUTO',
        tabla_afectada: 'asignacion_sesion',
        id_registro_afectado: String(sesionGuardada.id_asignacion),
        valores_nuevos: {
          id_computadora: pcBloqueada.id_computadora,
          codigo_equipo: pcBloqueada.codigo_equipo,
          registro_estudiante: estudiante.registro,
          nombre_estudiante: `${estudiante.nombres} ${estudiante.apellidos}`,
          id_sala: dto.id_sala,
          asignacion_automatica: esAutomatica,
        },
        ip_cliente: ip,
      });

      // Emisión síncrona por WebSocket
      this.emitirActualizacionEstadoSala(dto.id_sala);

      return {
        mensaje: `Puesto ${pcBloqueada.codigo_equipo} asignado exitosamente a ${estudiante.nombres} ${estudiante.apellidos}`,
        sesion: sesionGuardada,
        computadora: pcBloqueada,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Libera un puesto de cómputo ocupado, acumula horas y alerta sobre la cola
   */
  async liberarEquipo(dto: LiberarEquipoDto, idUsuarioAuxiliar: number, ip?: string) {
    const pc = await this.computadoraRepo.findOne({
      where: { id_computadora: dto.id_computadora },
      relations: { sala: true },
    });

    if (!pc) {
      throw new NotFoundException(`La computadora con ID ${dto.id_computadora} no existe`);
    }

    const sesionActiva = await this.sesionRepo.findOne({
      where: {
        id_computadora: pc.id_computadora,
        estado: 'EN_CURSO',
      },
      relations: { estudiante: true },
    });

    if (!sesionActiva) {
      // Si la máquina figuraba como OCUPADA pero no hay sesión, restablecemos
      if (pc.estado_actual === 'OCUPADA') {
        pc.estado_actual = 'DISPONIBLE';
        await this.computadoraRepo.save(pc);
        this.emitirActualizacionEstadoSala(pc.id_sala);
      }
      return {
        mensaje: `El puesto ${pc.codigo_equipo} ha sido marcado como DISPONIBLE`,
        computadora: pc,
        cola_pendiente_conteo: 0,
      };
    }

    const ahora = new Date();
    const minutosUso = Math.max(
      1,
      Math.round((ahora.getTime() - new Date(sesionActiva.fecha_hora_inicio).getTime()) / 60000),
    );

    const horasAdicionales = minutosUso / 60.0;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Finalizar sesión
      sesionActiva.fecha_hora_fin = ahora;
      sesionActiva.minutos_permanencia = minutosUso;
      sesionActiva.estado = 'CONCLUIDA';
      if (dto.observaciones) {
        sesionActiva.observaciones = dto.observaciones;
      }
      await queryRunner.manager.save(sesionActiva);

      // Actualizar computadora
      const pcActual = await queryRunner.manager.findOne(Computadora, {
        where: { id_computadora: pc.id_computadora },
      });
      if (pcActual) {
        pcActual.estado_actual = 'DISPONIBLE';
        pcActual.horas_uso_acumuladas = Number(
          (Number(pcActual.horas_uso_acumuladas || 0) + horasAdicionales).toFixed(2),
        );
        await queryRunner.manager.save(pcActual);
      }

      await queryRunner.commitTransaction();

      // Auditoría forense
      await this.auditoriaService.registrar({
        id_usuario: idUsuarioAuxiliar,
        accion: 'LIBERAR_EQUIPO_COMPUTO',
        tabla_afectada: 'asignacion_sesion',
        id_registro_afectado: String(sesionActiva.id_asignacion),
        valores_anteriores: { estado: 'EN_CURSO' },
        valores_nuevos: {
          estado: 'CONCLUIDA',
          minutos_permanencia: minutosUso,
          codigo_equipo: pc.codigo_equipo,
        },
        ip_cliente: ip,
      });

      // Contar estudiantes en cola de esta sala
      const colaPendiente = await this.colaRepo.count({
        where: { id_sala: pc.id_sala, estado_cola: 'EN_ESPERA' },
      });

      // Emisión síncrona por WebSocket
      this.emitirActualizacionEstadoSala(pc.id_sala);

      return {
        mensaje: `Puesto ${pc.codigo_equipo} liberado. Tiempo de permanencia: ${minutosUso} minutos.`,
        minutos_uso: minutosUso,
        estudiante: sesionActiva.estudiante,
        cola_pendiente_conteo: colaPendiente,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Reenvía el nuevo estado de la sala a los clientes conectados por WebSocket
   */
  private async emitirActualizacionEstadoSala(idSala: number) {
    try {
      const estadoActualizado = await this.obtenerEstadoSala(idSala);
      this.gateway.emitirActualizacionSala(idSala, estadoActualizado);
    } catch (err) {
      this.logger.error(`Error emitiendo WebSocket para sala ${idSala}:`, err);
    }
  }
}
