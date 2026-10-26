import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MantenimientoTaller,
  EstadoMantenimiento,
} from '../entities/mantenimiento-taller.entity';
import { ConfirmacionRetornoSala } from '../entities/confirmacion-retorno.entity';
import { IndicadorConfiabilidadRAMS } from '../entities/indicador-rams.entity';
import { Computadora } from '../../infraestructura/entities/computadora.entity';
import {
  AveriaEquipo,
  EstadoAveria,
} from '../../turnos/entities/averia-equipo.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { MetricasRamsService } from './metricas-rams.service';
import { OcupacionGateway } from '../../ocupacion/gateways/ocupacion.gateway';
import { CrearOrdenTallerDto } from '../dto/crear-orden-taller.dto';
import { IniciarMantenimientoDto } from '../dto/iniciar-mantenimiento.dto';
import { FinalizarMantenimientoDto } from '../dto/finalizar-mantenimiento.dto';
import { ConfirmarRetornoDto } from '../dto/confirmar-retorno.dto';
import { FiltroMantenimientoDto } from '../dto/filtro-mantenimiento.dto';

@Injectable()
export class SoporteService {
  private readonly logger = new Logger(SoporteService.name);

  constructor(
    @InjectRepository(MantenimientoTaller)
    private readonly mantenimientoRepo: Repository<MantenimientoTaller>,
    @InjectRepository(ConfirmacionRetornoSala)
    private readonly retornoRepo: Repository<ConfirmacionRetornoSala>,
    @InjectRepository(IndicadorConfiabilidadRAMS)
    private readonly indicadorRepo: Repository<IndicadorConfiabilidadRAMS>,
    @InjectRepository(Computadora)
    private readonly computadoraRepo: Repository<Computadora>,
    @InjectRepository(AveriaEquipo)
    private readonly averiaRepo: Repository<AveriaEquipo>,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    private readonly auditoriaService: AuditoriaService,
    private readonly metricasRamsService: MetricasRamsService,
    @Optional()
    private readonly ocupacionGateway?: OcupacionGateway,
  ) {}

  /**
   * CU24: Crear una nueva orden de mantenimiento en taller
   */
  async crearOrdenTaller(
    dto: CrearOrdenTallerDto,
    idUsuario: number,
    ip?: string,
  ): Promise<MantenimientoTaller> {
    const computadora = await this.computadoraRepo.findOne({
      where: { id_computadora: dto.id_computadora },
      relations: { sala: true },
    });

    if (!computadora) {
      throw new NotFoundException(
        `La computadora con ID ${dto.id_computadora} no existe`,
      );
    }

    let averia: AveriaEquipo | null = null;
    if (dto.id_averia) {
      averia = await this.averiaRepo.findOne({
        where: { id_averia: dto.id_averia },
      });
      if (averia) {
        averia.estado = EstadoAveria.EN_TALLER;
        await this.averiaRepo.save(averia);
      }
    }

    // Inhabilitar computadora a EN_MANTENIMIENTO
    computadora.estado_actual = 'EN_MANTENIMIENTO';
    await this.computadoraRepo.save(computadora);

    const nuevaOrden = this.mantenimientoRepo.create({
      id_computadora: dto.id_computadora,
      id_averia: dto.id_averia ?? null,
      id_usuario_tecnico: dto.id_usuario_tecnico ?? null,
      id_usuario_administrador: idUsuario,
      estado: EstadoMantenimiento.PENDIENTE_TALLER,
      tipo_mantenimiento: dto.tipo_mantenimiento,
      prioridad: dto.prioridad,
      descripcion_problema:
        dto.descripcion_problema ??
        dto.diagnostico_tecnico ??
        averia?.descrip_falla ??
        'Revisión técnica en taller',
      diagnostico_tecnico: dto.diagnostico_tecnico ?? null,
      fecha_hora_ingreso: new Date(),
    });

    const guardada = await this.mantenimientoRepo.save(nuevaOrden);

    await this.auditoriaService.registrar({
      id_usuario: idUsuario,
      accion: 'CREAR_ORDEN_TALLER',
      tabla_afectada: 'mantenimiento_taller',
      id_registro_afectado: String(guardada.id_mantenimiento),
      valores_nuevos: guardada as any,
      ip_cliente: ip,
    });

    return this.getOrdenById(guardada.id_mantenimiento);
  }

  /**
   * CU24: Listar órdenes de taller con soporte dual de paginación (page/limit y pagina/limite) y filtros
   */
  async getOrdenesTaller(
    params: FiltroMantenimientoDto,
    idUsuario?: number,
    roles?: string[],
  ) {
    const pagina = Number(params.page || params.pagina || 1);
    const limite = Number(params.limit || params.limite || 15);
    const skip = (pagina - 1) * limite;

    const qb = this.mantenimientoRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.computadora', 'c')
      .leftJoinAndSelect('c.sala', 's')
      .leftJoinAndSelect('m.tecnico', 't')
      .leftJoinAndSelect('m.administrador', 'a')
      .leftJoinAndSelect('m.averia', 'av')
      .leftJoinAndSelect('m.confirmacion_retorno', 'cr')
      .leftJoinAndSelect('cr.usuario_confirma', 'uc');

    const esAdmin = roles?.some((r) => r.toUpperCase() === 'ADMINISTRADOR');
    const esTecnico = roles?.some((r) => r.toUpperCase() === 'TECNICO');
    if (esTecnico && !esAdmin && idUsuario) {
      qb.andWhere('m.id_usuario_tecnico = :idTecnico', { idTecnico: idUsuario });
    }

    if (params.id_sala) {
      qb.andWhere('c.id_sala = :idSala', { idSala: params.id_sala });
    }

    if (params.id_computadora) {
      qb.andWhere('m.id_computadora = :idComputadora', {
        idComputadora: params.id_computadora,
      });
    }

    if (params.estado) {
      qb.andWhere('m.estado = :estado', { estado: params.estado });
    }

    if (params.busqueda && params.busqueda.trim() !== '') {
      const busqueda = `%${params.busqueda.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(c.codigo_equipo) LIKE :busqueda OR LOWER(m.descripcion_problema) LIKE :busqueda OR LOWER(m.diagnostico_tecnico) LIKE :busqueda OR LOWER(m.solucion_aplicada) LIKE :busqueda)',
        { busqueda },
      );
    }

    qb.orderBy('m.fecha_hora_ingreso', 'DESC');
    qb.skip(skip).take(limite);

    const [data, total] = await qb.getManyAndCount();

    return {
      total,
      pagina,
      limite,
      items: data,
      data,
    };
  }

  /**
   * Obtener detalle completo de una orden por ID
   */
  async getOrdenById(id: number): Promise<MantenimientoTaller> {
    const orden = await this.mantenimientoRepo.findOne({
      where: { id_mantenimiento: id },
      relations: {
        computadora: {
          sala: true,
        },
        tecnico: true,
        administrador: true,
        averia: true,
        confirmacion_retorno: {
          usuario_confirma: true,
        },
      },
    });

    if (!orden) {
      throw new NotFoundException(`La orden de taller con ID #${id} no existe`);
    }

    return orden;
  }

  /**
   * CU24: Iniciar reparación en banco de trabajo (asigna técnico y diagnóstico inicial)
   */
  async iniciarReparacion(
    id: number,
    dto: IniciarMantenimientoDto,
    idUsuario: number,
    ip?: string,
  ): Promise<MantenimientoTaller> {
    const orden = await this.getOrdenById(id);

    if (
      orden.estado === EstadoMantenimiento.RETORNADO_A_SALA ||
      orden.estado === EstadoMantenimiento.BAJA_DEFINITIVA
    ) {
      throw new BadRequestException(
        `No se puede iniciar reparación en una orden con estado ${orden.estado}`,
      );
    }

    const valoresAnteriores = { ...orden };

    orden.estado = EstadoMantenimiento.EN_REPARACION;
    orden.id_usuario_tecnico = dto.id_usuario_tecnico ?? idUsuario;
    orden.diagnostico_tecnico = dto.diagnostico_tecnico;
    orden.fecha_hora_inicio_taller = dto.fecha_hora_inicio
      ? new Date(dto.fecha_hora_inicio)
      : new Date();

    const actualizada = await this.mantenimientoRepo.save(orden);

    await this.auditoriaService.registrar({
      id_usuario: idUsuario,
      accion: 'INICIAR_MANTENIMIENTO',
      tabla_afectada: 'mantenimiento_taller',
      id_registro_afectado: String(actualizada.id_mantenimiento),
      valores_anteriores: valoresAnteriores,
      valores_nuevos: actualizada as any,
      ip_cliente: ip,
    });

    return this.getOrdenById(actualizada.id_mantenimiento);
  }

  /**
   * CU24: Finalizar intervención técnica en taller (solución aplicada, repuestos y duración MTTR)
   */
  async finalizarReparacion(
    id: number,
    dto: FinalizarMantenimientoDto,
    idUsuario: number,
    ip?: string,
  ): Promise<MantenimientoTaller> {
    const orden = await this.getOrdenById(id);

    if (
      orden.estado === EstadoMantenimiento.RETORNADO_A_SALA ||
      orden.estado === EstadoMantenimiento.BAJA_DEFINITIVA
    ) {
      throw new BadRequestException(
        `La orden #${id} ya se encuentra concluida (${orden.estado})`,
      );
    }

    const valoresAnteriores = { ...orden };
    const fechaFin = dto.fecha_hora_fin
      ? new Date(dto.fecha_hora_fin)
      : new Date();

    // Cálculo automático de duración si no viene explícita
    let duracionHoras = dto.duracion_taller_horas;
    if (duracionHoras === undefined || duracionHoras === null) {
      const fechaInicio =
        orden.fecha_hora_inicio_taller || orden.fecha_hora_ingreso;
      if (fechaInicio) {
        const ms = fechaFin.getTime() - new Date(fechaInicio).getTime();
        duracionHoras =
          Math.round(Math.max(0.1, ms / (1000 * 3600)) * 100) / 100;
      } else {
        duracionHoras = 1.0;
      }
    }

    orden.estado = EstadoMantenimiento.REPARADO_EN_TALLER;
    orden.solucion_aplicada = dto.solucion_aplicada;
    orden.repuestos_utilizados = dto.repuestos_utilizados ?? null;
    orden.duracion_taller_horas = duracionHoras;
    orden.costo_reparacion = dto.costo_reparacion ?? null;
    orden.fecha_hora_fin_taller = fechaFin;

    const actualizada = await this.mantenimientoRepo.save(orden);

    await this.auditoriaService.registrar({
      id_usuario: idUsuario,
      accion: 'FINALIZAR_MANTENIMIENTO',
      tabla_afectada: 'mantenimiento_taller',
      id_registro_afectado: String(actualizada.id_mantenimiento),
      valores_anteriores: valoresAnteriores,
      valores_nuevos: actualizada as any,
      ip_cliente: ip,
    });

    return this.getOrdenById(actualizada.id_mantenimiento);
  }

  /**
   * CU25: Confirmar retorno físico a sala
   * Pone la máquina en DISPONIBLE, la avería en REPARADO,
   * recalcula indicadores RAMS y emite WebSocket en tiempo real.
   */
  async confirmarRetornoSala(
    id: number,
    dto: ConfirmarRetornoDto,
    idUsuario: number,
    ip?: string,
  ): Promise<{
    mantenimiento: MantenimientoTaller;
    confirmacion: ConfirmacionRetornoSala;
  }> {
    const orden = await this.getOrdenById(id);

    if (orden.estado === EstadoMantenimiento.RETORNADO_A_SALA) {
      throw new BadRequestException(
        `La orden #${id} ya fue retornada a sala previamente`,
      );
    }
    if (orden.estado === EstadoMantenimiento.BAJA_DEFINITIVA) {
      throw new BadRequestException(
        `El equipo de la orden #${id} fue dado de baja definitiva`,
      );
    }

    const valoresAnteriores = { ...orden };
    const fechaRetorno = new Date();

    // 1. Actualizar estado de orden
    orden.estado = EstadoMantenimiento.RETORNADO_A_SALA;
    const ordenGuardada = await this.mantenimientoRepo.save(orden);

    // 2. Registrar acta de confirmación de retorno
    let confirmacion = await this.retornoRepo.findOne({
      where: { id_mantenimiento: id },
    });

    if (confirmacion) {
      confirmacion.pruebas_satisfactorias = dto.pruebas_satisfactorias ?? true;
      confirmacion.obs_instalacion = dto.obs_instalacion ?? null;
      confirmacion.fecha_hora_retorno = fechaRetorno;
      confirmacion.id_usuario_confirma = dto.id_usuario_confirma ?? idUsuario;
    } else {
      confirmacion = this.retornoRepo.create({
        id_mantenimiento: id,
        id_usuario_confirma: dto.id_usuario_confirma ?? idUsuario,
        fecha_hora_retorno: fechaRetorno,
        pruebas_satisfactorias: dto.pruebas_satisfactorias ?? true,
        obs_instalacion: dto.obs_instalacion ?? null,
      });
    }
    const confirmacionGuardada = await this.retornoRepo.save(confirmacion);

    // 3. Conmutar computadora a DISPONIBLE
    const pc = await this.computadoraRepo.findOne({
      where: { id_computadora: orden.id_computadora },
    });
    if (pc) {
      pc.estado_actual = 'DISPONIBLE';
      await this.computadoraRepo.save(pc);
    }

    // 4. Conmutar avería originaria a REPARADO
    if (orden.id_averia) {
      const averia = await this.averiaRepo.findOne({
        where: { id_averia: orden.id_averia },
      });
      if (averia) {
        averia.estado = EstadoAveria.REPARADO;
        averia.fecha_solucion = fechaRetorno;
        averia.solucion_tecnica =
          orden.solucion_aplicada || 'Reparado satisfactoriamente en taller';
        await this.averiaRepo.save(averia);
      }
    }

    // 5. Recalcular indicadores RAMS de la computadora
    try {
      await this.metricasRamsService.calcularMetricasComputadora(
        orden.id_computadora,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Error recalculando RAMS para PC ${orden.id_computadora}: ${msg}`,
      );
    }

    // 6. Notificar por WebSocket si la pasarela está activa
    if (this.ocupacionGateway && pc?.id_sala) {
      try {
        this.ocupacionGateway.emitirActualizacionSala(pc.id_sala, {
          id_computadora: pc.id_computadora,
          estado_actual: 'DISPONIBLE',
          accion: 'RETORNO_A_SALA',
          id_mantenimiento: id,
          timestamp: new Date(),
        });
      } catch (wsErr: unknown) {
        const wsMsg = wsErr instanceof Error ? wsErr.message : String(wsErr);
        this.logger.warn(`Error emitiendo evento WS: ${wsMsg}`);
      }
    }

    // 7. Auditoría
    await this.auditoriaService.registrar({
      id_usuario: idUsuario,
      accion: 'CONFIRMAR_RETORNO_SALA',
      tabla_afectada: 'confirmacion_retorno_sala',
      id_registro_afectado: String(confirmacionGuardada.id_retorno),
      valores_anteriores: valoresAnteriores,
      valores_nuevos: {
        orden: ordenGuardada,
        confirmacion: confirmacionGuardada,
      } as any,
      ip_cliente: ip,
    });

    const ordenCompleta = await this.getOrdenById(id);
    return {
      mantenimiento: ordenCompleta,
      confirmacion: confirmacionGuardada,
    };
  }

  /**
   * CU24 (Excepción): Declarar baja técnica definitiva de equipo irreparable
   */
  async darDeBaja(
    id: number,
    motivo: string,
    idUsuario: number,
    ip?: string,
  ): Promise<MantenimientoTaller> {
    const orden = await this.getOrdenById(id);

    if (orden.estado === EstadoMantenimiento.BAJA_DEFINITIVA) {
      throw new BadRequestException(
        `La orden #${id} ya fue dada de baja definitiva`,
      );
    }

    const valoresAnteriores = { ...orden };

    orden.estado = EstadoMantenimiento.BAJA_DEFINITIVA;
    orden.motivo_baja = motivo;
    orden.fecha_hora_fin_taller = new Date();
    const actualizada = await this.mantenimientoRepo.save(orden);

    // Inhabilitar computadora de inventario
    const pc = await this.computadoraRepo.findOne({
      where: { id_computadora: orden.id_computadora },
    });
    if (pc) {
      pc.estado_actual = 'DE_BAJA';
      pc.activo = false;
      await this.computadoraRepo.save(pc);
    }

    // Actualizar avería si existe
    if (orden.id_averia) {
      const averia = await this.averiaRepo.findOne({
        where: { id_averia: orden.id_averia },
      });
      if (averia) {
        averia.estado = EstadoAveria.DESCARTADO;
        averia.solucion_tecnica = `Dada de baja definitiva: ${motivo}`;
        averia.fecha_solucion = new Date();
        await this.averiaRepo.save(averia);
      }
    }

    await this.auditoriaService.registrar({
      id_usuario: idUsuario,
      accion: 'DAR_DE_BAJA_EQUIPO',
      tabla_afectada: 'mantenimiento_taller',
      id_registro_afectado: String(actualizada.id_mantenimiento),
      valores_anteriores: valoresAnteriores,
      valores_nuevos: actualizada as any,
      ip_cliente: ip,
    });

    return this.getOrdenById(actualizada.id_mantenimiento);
  }

  /**
   * Obtener tablero consolidado de métricas RAMS
   */
  async getMetricasRamsDashboard(params: {
    id_sala?: number;
    mes?: number;
    anio?: number;
  }) {
    return this.metricasRamsService.getDashboardRAMS(params);
  }

  /**
   * Forzar recalculo de métricas RAMS
   */
  async recalcularRams(
    idComputadora?: number,
    idSala?: number,
    mes?: number,
    anio?: number,
  ) {
    if (idComputadora) {
      return this.metricasRamsService.calcularMetricasComputadora(
        idComputadora,
        mes,
        anio,
      );
    }
    if (idSala) {
      return this.metricasRamsService.calcularMetricasSala(idSala, mes, anio);
    }
    return this.metricasRamsService.getDashboardRAMS({ mes, anio });
  }

  /**
   * Obtener listado de usuarios con rol TÉCNICO activos
   */
  async getTecnicos(): Promise<Usuario[]> {
    const tecnicos = await this.usuarioRepo
      .createQueryBuilder('u')
      .innerJoin('u.roles', 'r')
      .where('r.nombre = :rol', { rol: 'TECNICO' })
      .andWhere('u.activo = :activo', { activo: true })
      .orderBy('u.nombres', 'ASC')
      .getMany();

    return tecnicos.map((t) => {
      const { password_hash: _password_hash, ...uRest } = t;
      return uRest as Usuario;
    });
  }
}
