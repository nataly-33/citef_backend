import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EjecucionMl,
  TipoOperacionMl,
} from '../entities/ejecucion-ml.entity';
import { LaboratorioSala } from '../../infraestructura/entities/laboratorio-sala.entity';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import {
  AnalyticsFastApiClient,
  PrediccionDemandaResultado,
  SimulacionColasResultado,
} from '../clients/analytics-fastapi.client';
import { ConsultarPrediccionDto } from '../dto/consultar-prediccion.dto';
import { SimularColasDto } from '../dto/simular-colas.dto';

@Injectable()
export class AnaliticaPredictivaService {
  private readonly logger = new Logger(AnaliticaPredictivaService.name);

  constructor(
    private readonly fastApiClient: AnalyticsFastApiClient,
    @InjectRepository(EjecucionMl)
    private readonly ejecucionRepo: Repository<EjecucionMl>,
    @InjectRepository(LaboratorioSala)
    private readonly salaRepo: Repository<LaboratorioSala>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Ejecuta o consulta la inferencia de demanda horaria para una sala y registra la trazabilidad
   */
  async predecirDemanda(
    dto: ConsultarPrediccionDto,
    idUsuario: number,
  ): Promise<PrediccionDemandaResultado & { id_ejecucion: number; tiempo_respuesta_ms: number }> {
    const sala = await this.salaRepo.findOne({
      where: { id_sala: dto.id_sala },
      relations: { computadoras: true },
    });

    if (!sala) {
      throw new NotFoundException(`La sala con ID ${dto.id_sala} no existe`);
    }

    // Si no se proveyó capacidad explícita, inferir de la sala física
    if (!dto.capacidad_sala) {
      dto.capacidad_sala =
        sala.computadoras && sala.computadoras.length > 0
          ? sala.computadoras.length
          : sala.cant_estudiantes || 24;
    }

    const tInicio = Date.now();
    const resultado = await this.fastApiClient.predecirDemanda(dto);
    const tDuracionMs = Date.now() - tInicio;

    // Persistir ejecución en base de datos para auditoría y trazabilidad
    const ejecucion = this.ejecucionRepo.create({
      tipo_operacion: TipoOperacionMl.PREDICCION_DEMANDA,
      id_sala: dto.id_sala,
      parametros_entrada: { ...dto },
      resultado_salida: { ...resultado },
      id_usuario: idUsuario,
      tiempo_respuesta_ms: tDuracionMs,
    });
    const guardada = await this.ejecucionRepo.save(ejecucion);

    // Registro forense en bitácora de auditoría
    await this.auditoriaService.registrar({
      id_usuario: idUsuario,
      accion: 'EJECUTAR_PREDICCION_DEMANDA_ML',
      tabla_afectada: 'ejecucion_ml',
      id_registro_afectado: String(guardada.id_ejecucion),
      valores_nuevos: {
        id_sala: dto.id_sala,
        tasa_ocupacion_proyectada: resultado.tasa_ocupacion_proyectada,
        nivel_riesgo_saturacion: resultado.nivel_riesgo_saturacion,
        fallback_local: resultado.fallback_local,
        tiempo_respuesta_ms: tDuracionMs,
      },
    });

    return {
      ...resultado,
      id_ejecucion: guardada.id_ejecucion,
      tiempo_respuesta_ms: tDuracionMs,
    };
  }

  /**
   * Ejecuta la simulación matemática de colas M/M/c (Erlang-C) con trazabilidad analítica
   */
  async simularColas(
    dto: SimularColasDto,
    idUsuario: number,
  ): Promise<SimulacionColasResultado & { id_ejecucion: number; tiempo_respuesta_ms: number }> {
    const tInicio = Date.now();
    const resultado = await this.fastApiClient.simularColas(dto);
    const tDuracionMs = Date.now() - tInicio;

    // Persistir ejecución
    const ejecucion = this.ejecucionRepo.create({
      tipo_operacion: TipoOperacionMl.SIMULACION_COLAS_MMC,
      id_sala: null,
      parametros_entrada: { ...dto },
      resultado_salida: { ...resultado },
      id_usuario: idUsuario,
      tiempo_respuesta_ms: tDuracionMs,
    });
    const guardada = await this.ejecucionRepo.save(ejecucion);

    // Registro forense
    await this.auditoriaService.registrar({
      id_usuario: idUsuario,
      accion: 'EJECUTAR_SIMULACION_COLAS_MMC',
      tabla_afectada: 'ejecucion_ml',
      id_registro_afectado: String(guardada.id_ejecucion),
      valores_nuevos: {
        lambda: dto.lambda_llegadas,
        mu: dto.mu_servicio,
        c: dto.c_servidores,
        factor_utilizacion_rho: resultado.factor_utilizacion_rho,
        wq_minutos_espera: resultado.wq_minutos_espera_cola,
        fallback_local: resultado.fallback_local,
        tiempo_respuesta_ms: tDuracionMs,
      },
    });

    return {
      ...resultado,
      id_ejecucion: guardada.id_ejecucion,
      tiempo_respuesta_ms: tDuracionMs,
    };
  }

  /**
   * Lista el histórico de ejecuciones predictivas y analíticas
   */
  async getHistorialEjecuciones(tipo?: string, limite = 15) {
    const qb = this.ejecucionRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.sala', 's')
      .leftJoinAndSelect('e.usuario', 'u')
      .orderBy('e.fecha_ejecucion', 'DESC')
      .take(limite);

    if (tipo) {
      qb.andWhere('e.tipo_operacion = :tipo', { tipo });
    }

    const ejecuciones = await qb.getMany();
    return ejecuciones.map((e) => {
      if (e.usuario) {
        const { password_hash, ...uSinHash } = e.usuario as any;
        e.usuario = uSinHash;
      }
      return e;
    });
  }

  /**
   * Consulta el estado de salud del microservicio FastAPI
   */
  async checkFastApiHealth() {
    return this.fastApiClient.checkHealth();
  }
}
