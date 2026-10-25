import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Computadora } from '../entities/computadora.entity';
import { LaboratorioSala } from '../entities/laboratorio-sala.entity';
import { PerifericoInventario } from '../entities/periferico-inventario.entity';
import { AsignacionSesion } from '../../ocupacion/entities/asignacion-sesion.entity';
import { CrearComputadoraDto } from '../dto/crear-computadora.dto';
import { ActualizarComputadoraDto } from '../dto/actualizar-computadora.dto';
import { GuardarPosicionesComputadorasDto } from '../dto/guardar-posiciones-computadoras.dto';
import { AuditoriaService } from '../../auditoria/auditoria.service';

@Injectable()
export class ComputadorasService {
  private readonly logger = new Logger(ComputadorasService.name);

  constructor(
    @InjectRepository(Computadora)
    private readonly computadoraRepo: Repository<Computadora>,
    @InjectRepository(LaboratorioSala)
    private readonly salaRepo: Repository<LaboratorioSala>,
    @InjectRepository(PerifericoInventario)
    private readonly perifericoRepo: Repository<PerifericoInventario>,
    @InjectRepository(AsignacionSesion)
    private readonly sesionRepo: Repository<AsignacionSesion>,
    private readonly auditoriaService: AuditoriaService,
    private readonly dataSource: DataSource,
  ) {}

  async findBySala(idSala: number) {
    const sala = await this.salaRepo.findOne({
      where: { id_sala: idSala },
    });
    if (!sala) {
      throw new NotFoundException(`Sala con ID ${idSala} no encontrada`);
    }

    const computadoras = await this.computadoraRepo.find({
      where: { id_sala: idSala },
      relations: {
        perifericos: {
          tipo: true,
        },
      },
      order: {
        posicion_fila: 'ASC',
        posicion_columna: 'ASC',
      },
    });

    const sesionesActivas = await this.sesionRepo.find({
      where: {
        estado: 'EN_CURSO',
      },
      relations: {
        estudiante: { carrera: true },
        motivo: true,
      },
    });

    const sesionPorPc = new Map<number, AsignacionSesion>();
    for (const s of sesionesActivas) {
      sesionPorPc.set(Number(s.id_computadora), s);
    }

    const computadorasConSesion = computadoras.map((pc) => {
      const s = sesionPorPc.get(Number(pc.id_computadora));
      if (!s) return pc;
      const ahora = new Date();
      const minutosTranscurridos = Math.max(
        1,
        Math.round(
          (ahora.getTime() - new Date(s.fecha_hora_inicio).getTime()) / 60000,
        ),
      );
      return {
        ...pc,
        sesion_activa: {
          id_asignacion: s.id_asignacion,
          registro_estudiante: s.registro_estudiante,
          estudiante_nombres: s.estudiante
            ? `${s.estudiante.nombres} ${s.estudiante.apellidos}`
            : 'Estudiante',
          carrera_nombre: s.estudiante?.carrera?.nombre || 'General',
          motivo_descrip: s.motivo?.descrip || 'Uso libre',
          fecha_hora_inicio: s.fecha_hora_inicio,
          minutos_transcurridos: minutosTranscurridos,
        },
      };
    });

    return {
      sala,
      computadoras: computadorasConSesion,
    };
  }

  async findOne(id: number) {
    const pc = await this.computadoraRepo.findOne({
      where: { id_computadora: id },
      relations: {
        sala: true,
        perifericos: {
          tipo: true,
        },
      },
    });

    if (!pc) {
      throw new NotFoundException(`Computadora con ID ${id} no encontrada`);
    }

    const s = await this.sesionRepo.findOne({
      where: { id_computadora: id, estado: 'EN_CURSO' },
      relations: { estudiante: { carrera: true }, motivo: true },
    });

    if (s) {
      const ahora = new Date();
      const minutosTranscurridos = Math.max(
        1,
        Math.round(
          (ahora.getTime() - new Date(s.fecha_hora_inicio).getTime()) / 60000,
        ),
      );
      return {
        ...pc,
        sesion_activa: {
          id_asignacion: s.id_asignacion,
          registro_estudiante: s.registro_estudiante,
          estudiante_nombres: s.estudiante
            ? `${s.estudiante.nombres} ${s.estudiante.apellidos}`
            : 'Estudiante',
          carrera_nombre: s.estudiante?.carrera?.nombre || 'General',
          motivo_descrip: s.motivo?.descrip || 'Uso libre',
          fecha_hora_inicio: s.fecha_hora_inicio,
          minutos_transcurridos: minutosTranscurridos,
        },
      };
    }

    return pc;
  }

  async crear(
    dto: CrearComputadoraDto,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    const sala = await this.salaRepo.findOne({
      where: { id_sala: dto.id_sala },
      relations: { computadoras: true },
    });

    if (!sala) {
      throw new NotFoundException(`Sala con ID ${dto.id_sala} no encontrada`);
    }

    // Validar capacidad de sala
    const computadorasActivas =
      sala.computadoras?.filter((c) => c.activo) || [];
    const maxPermitido = sala.cant_estudiantes + (sala.maquina_docente ? 1 : 0);
    if (computadorasActivas.length >= maxPermitido) {
      throw new BadRequestException(
        `La sala "${sala.nombre}" ha alcanzado su capacidad máxima permitida de ${maxPermitido} equipos (${sala.cant_estudiantes} estudiantes + ${sala.maquina_docente ? 1 : 0} docente)`,
      );
    }

    // Validar unicidad de código de equipo
    const codigo_equipo = dto.codigo_equipo.trim().toUpperCase();
    const existeCodigo = await this.computadoraRepo.findOne({
      where: { codigo_equipo },
    });
    if (existeCodigo) {
      throw new ConflictException(
        `Ya existe un equipo con el código patrimonial "${codigo_equipo}"`,
      );
    }

    // Validar límites de la cuadrícula
    if (
      dto.posicion_fila < 1 ||
      dto.posicion_fila > sala.filas_cuadricula ||
      dto.posicion_columna < 1 ||
      dto.posicion_columna > sala.columnas_cuadricula
    ) {
      throw new BadRequestException(
        `La posición (${dto.posicion_fila}, ${dto.posicion_columna}) está fuera de los límites de la sala (${sala.filas_cuadricula} filas x ${sala.columnas_cuadricula} columnas)`,
      );
    }

    // Validar colisión en la celda
    const ocupada = await this.computadoraRepo.findOne({
      where: {
        id_sala: dto.id_sala,
        posicion_fila: dto.posicion_fila,
        posicion_columna: dto.posicion_columna,
        activo: true,
      },
    });
    if (ocupada) {
      throw new ConflictException(
        `La celda (Fila ${dto.posicion_fila}, Columna ${dto.posicion_columna}) ya está ocupada por el equipo "${ocupada.codigo_equipo}"`,
      );
    }

    const nueva = this.computadoraRepo.create({
      id_sala: dto.id_sala,
      codigo_equipo,
      maquina_docente: dto.maquina_docente ?? false,
      posicion_fila: dto.posicion_fila,
      posicion_columna: dto.posicion_columna,
      estado_actual: dto.estado_actual ?? 'DISPONIBLE',
      ip_red: dto.ip_red?.trim() || null,
      mac_address: dto.mac_address?.trim() || null,
      horas_uso_acumuladas: dto.horas_uso_acumuladas ?? 0,
      activo: true,
    });

    const guardada = await this.computadoraRepo.save(nueva);

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo || 'sistema@uagrm.edu.bo',
      accion: 'CREAR',
      tabla_afectada: 'computadora',
      id_registro_afectado: String(guardada.id_computadora),
      valores_nuevos: guardada,
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[COMPUTADORAS] Equipo ${guardada.codigo_equipo} creado en Sala ID ${guardada.id_sala} pos (${guardada.posicion_fila}, ${guardada.posicion_columna}) por ${ejecutor?.correo || 'Sistema'}`,
    );

    return guardada;
  }

  async actualizar(
    id: number,
    dto: ActualizarComputadoraDto,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    const pc = await this.computadoraRepo.findOne({
      where: { id_computadora: id },
      relations: { sala: true },
    });

    if (!pc) {
      throw new NotFoundException(`Computadora con ID ${id} no encontrada`);
    }

    const valoresAnteriores = { ...pc };

    if (dto.codigo_equipo) {
      const nuevoCodigo = dto.codigo_equipo.trim().toUpperCase();
      if (nuevoCodigo !== pc.codigo_equipo) {
        const existe = await this.computadoraRepo.findOne({
          where: { codigo_equipo: nuevoCodigo },
        });
        if (existe) {
          throw new ConflictException(
            `El código de equipo "${nuevoCodigo}" ya está asignado a otra computadora`,
          );
        }
        pc.codigo_equipo = nuevoCodigo;
      }
    }

    const nuevaFila =
      dto.posicion_fila !== undefined ? dto.posicion_fila : pc.posicion_fila;
    const nuevaCol =
      dto.posicion_columna !== undefined
        ? dto.posicion_columna
        : pc.posicion_columna;

    if (dto.posicion_fila !== undefined || dto.posicion_columna !== undefined) {
      if (
        nuevaFila < 1 ||
        nuevaFila > pc.sala.filas_cuadricula ||
        nuevaCol < 1 ||
        nuevaCol > pc.sala.columnas_cuadricula
      ) {
        throw new BadRequestException(
          `La posición (${nuevaFila}, ${nuevaCol}) está fuera de los límites de la sala (${pc.sala.filas_cuadricula} filas x ${pc.sala.columnas_cuadricula} columnas)`,
        );
      }

      // Validar si otra PC ocupa la misma coordenada
      const colision = await this.computadoraRepo
        .createQueryBuilder('c')
        .where('c.id_sala = :idSala', { idSala: pc.id_sala })
        .andWhere('c.posicion_fila = :fila', { fila: nuevaFila })
        .andWhere('c.posicion_columna = :col', { col: nuevaCol })
        .andWhere('c.id_computadora != :id', { id: pc.id_computadora })
        .andWhere('c.activo = true')
        .getOne();

      if (colision) {
        throw new ConflictException(
          `La posición (${nuevaFila}, ${nuevaCol}) ya está ocupada por el equipo "${colision.codigo_equipo}"`,
        );
      }

      pc.posicion_fila = nuevaFila;
      pc.posicion_columna = nuevaCol;
    }

    // Si cambia de estado y deja de estar OCUPADA (o se desactiva), concluir cualquier sesión en curso
    const sesionActiva = await this.sesionRepo.findOne({
      where: {
        id_computadora: id,
        estado: 'EN_CURSO',
      },
      relations: { estudiante: true },
    });

    if (
      sesionActiva &&
      ((dto.estado_actual !== undefined && dto.estado_actual !== 'OCUPADA') ||
        dto.activo === false)
    ) {
      const ahora = new Date();
      const minutosUso = Math.max(
        1,
        Math.round(
          (ahora.getTime() -
            new Date(sesionActiva.fecha_hora_inicio).getTime()) /
            60000,
        ),
      );
      const horasAdicionales = minutosUso / 60.0;

      sesionActiva.fecha_hora_fin = ahora;
      sesionActiva.minutos_permanencia = minutosUso;
      sesionActiva.estado = 'CONCLUIDA';
      sesionActiva.observaciones =
        (sesionActiva.observaciones ? `${sesionActiva.observaciones} | ` : '') +
        `Sesión finalizada administrativamente por cambio de estado a "${dto.estado_actual || 'INACTIVA'}" desde editor de cuadrícula.`;
      await this.sesionRepo.save(sesionActiva);

      if (dto.horas_uso_acumuladas === undefined) {
        pc.horas_uso_acumuladas = Number(
          (Number(pc.horas_uso_acumuladas || 0) + horasAdicionales).toFixed(2),
        );
      }

      await this.auditoriaService.registrar({
        id_usuario: ejecutor?.id_usuario,
        correo_usuario: ejecutor?.correo || 'sistema@uagrm.edu.bo',
        accion: 'LIBERAR_EQUIPO_COMPUTO',
        tabla_afectada: 'asignacion_sesion',
        id_registro_afectado: String(sesionActiva.id_asignacion),
        valores_anteriores: { estado: 'EN_CURSO' },
        valores_nuevos: {
          estado: 'CONCLUIDA',
          minutos_permanencia: minutosUso,
          motivo_cierre: `Cambio de estado administrativo a ${dto.estado_actual || 'INACTIVA'}`,
        },
        ip_cliente: ipCliente,
      });

      this.logger.log(
        `[COMPUTADORAS] Sesión #${sesionActiva.id_asignacion} de ${sesionActiva.registro_estudiante} concluida automáticamente (${minutosUso} min) en PC ${pc.codigo_equipo}`,
      );
    }

    if (dto.maquina_docente !== undefined)
      pc.maquina_docente = dto.maquina_docente;
    if (dto.estado_actual !== undefined) pc.estado_actual = dto.estado_actual;
    if (dto.ip_red !== undefined)
      pc.ip_red = dto.ip_red ? dto.ip_red.trim() : null;
    if (dto.mac_address !== undefined)
      pc.mac_address = dto.mac_address ? dto.mac_address.trim() : null;
    if (dto.horas_uso_acumuladas !== undefined)
      pc.horas_uso_acumuladas = dto.horas_uso_acumuladas;
    if (dto.activo !== undefined) pc.activo = dto.activo;

    const actualizada = await this.computadoraRepo.save(pc);

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo || 'sistema@uagrm.edu.bo',
      accion: 'ACTUALIZAR',
      tabla_afectada: 'computadora',
      id_registro_afectado: String(actualizada.id_computadora),
      valores_anteriores: valoresAnteriores,
      valores_nuevos: actualizada,
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[COMPUTADORAS] Equipo ${actualizada.codigo_equipo} actualizado por ${ejecutor?.correo || 'Sistema'}`,
    );

    return actualizada;
  }

  async guardarPosicionesMasivas(
    idSala: number,
    dto: GuardarPosicionesComputadorasDto,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    const sala = await this.salaRepo.findOne({
      where: { id_sala: idSala },
    });

    if (!sala) {
      throw new NotFoundException(`Sala con ID ${idSala} no encontrada`);
    }

    const { posiciones } = dto;
    if (!posiciones || posiciones.length === 0) {
      throw new BadRequestException(
        'El listado de posiciones no puede estar vacío',
      );
    }

    // Validar solapamientos internos en el payload recibido
    const celdasOcupadas = new Set<string>();
    for (const p of posiciones) {
      if (
        p.posicion_fila < 1 ||
        p.posicion_fila > sala.filas_cuadricula ||
        p.posicion_columna < 1 ||
        p.posicion_columna > sala.columnas_cuadricula
      ) {
        throw new BadRequestException(
          `Coordenada (${p.posicion_fila}, ${p.posicion_columna}) fuera de límites (${sala.filas_cuadricula}x${sala.columnas_cuadricula})`,
        );
      }

      const key = `${p.posicion_fila}-${p.posicion_columna}`;
      if (celdasOcupadas.has(key)) {
        throw new BadRequestException(
          `Colisión detectada en la cuadrícula: más de un equipo asignado a la celda (${p.posicion_fila}, ${p.posicion_columna})`,
        );
      }
      celdasOcupadas.add(key);
    }

    // Actualizar en transacción
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Fase 1: Asignar coordenadas temporales negativas para evitar violaciones de clave única durante reubicaciones
      for (let i = 0; i < posiciones.length; i++) {
        const p = posiciones[i];
        await queryRunner.manager.update(
          Computadora,
          { id_computadora: p.id_computadora, id_sala: idSala },
          {
            posicion_fila: -(i + 1),
            posicion_columna: -(i + 1),
          },
        );
      }

      // Fase 2: Asignar las coordenadas finales solicitadas
      for (const p of posiciones) {
        await queryRunner.manager.update(
          Computadora,
          { id_computadora: p.id_computadora, id_sala: idSala },
          {
            posicion_fila: p.posicion_fila,
            posicion_columna: p.posicion_columna,
          },
        );
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error guardando posiciones masivas: ${err.message}`,
        err.stack,
      );
      throw new BadRequestException(
        `No se pudieron guardar las posiciones: ${err.message}`,
      );
    } finally {
      await queryRunner.release();
    }

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo || 'sistema@uagrm.edu.bo',
      accion: 'ACTUALIZAR',
      tabla_afectada: 'computadora',
      id_registro_afectado: `SALA_${idSala}_MASIVO`,
      valores_nuevos: { total_reubicadas: posiciones.length, posiciones },
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[COMPUTADORAS] Cuadrícula de Sala ${sala.codigo_sala} actualizada con ${posiciones.length} coordenadas por ${ejecutor?.correo || 'Sistema'}`,
    );

    return this.findBySala(idSala);
  }

  async eliminar(
    id: number,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    const pc = await this.computadoraRepo.findOne({
      where: { id_computadora: id },
    });

    if (!pc) {
      throw new NotFoundException(`Computadora con ID ${id} no encontrada`);
    }

    const valoresAnteriores = { ...pc };
    pc.activo = !pc.activo;
    const guardada = await this.computadoraRepo.save(pc);

    if (!guardada.activo) {
      const sesionActiva = await this.sesionRepo.findOne({
        where: { id_computadora: id, estado: 'EN_CURSO' },
        relations: { estudiante: true },
      });
      if (sesionActiva) {
        const ahora = new Date();
        const minutosUso = Math.max(
          1,
          Math.round(
            (ahora.getTime() -
              new Date(sesionActiva.fecha_hora_inicio).getTime()) /
              60000,
          ),
        );
        sesionActiva.fecha_hora_fin = ahora;
        sesionActiva.minutos_permanencia = minutosUso;
        sesionActiva.estado = 'CONCLUIDA';
        sesionActiva.observaciones =
          (sesionActiva.observaciones
            ? `${sesionActiva.observaciones} | `
            : '') +
          'Sesión finalizada automáticamente por desactivación/retiro de equipo.';
        await this.sesionRepo.save(sesionActiva);

        guardada.horas_uso_acumuladas = Number(
          (
            Number(guardada.horas_uso_acumuladas || 0) +
            minutosUso / 60.0
          ).toFixed(2),
        );
        await this.computadoraRepo.save(guardada);
      }

      await this.perifericoRepo.update(
        { id_computadora: guardada.id_computadora },
        { id_computadora: null },
      );
    }

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo || 'sistema@uagrm.edu.bo',
      accion: guardada.activo ? 'RESTAURAR' : 'DESACTIVAR',
      tabla_afectada: 'computadora',
      id_registro_afectado: String(guardada.id_computadora),
      valores_anteriores: valoresAnteriores,
      valores_nuevos: guardada,
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[COMPUTADORAS] Equipo ${guardada.codigo_equipo} ${guardada.activo ? 'reactivado' : 'desactivado'} por ${ejecutor?.correo || 'Sistema'}`,
    );

    return guardada;
  }
}
