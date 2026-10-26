import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConsultarPrediccionDto } from '../dto/consultar-prediccion.dto';
import { SimularColasDto } from '../dto/simular-colas.dto';

export interface PrediccionDemandaResultado {
  fallback_local: boolean;
  id_sala: number;
  fecha: string;
  capacidad_sala: number;
  es_semana_examenes: boolean;
  demanda_promedio_estudiantes: number;
  pico_maximo_estudiantes: number;
  hora_pico_maximo: number;
  tasa_ocupacion_proyectada: number;
  nivel_riesgo_saturacion: 'OPTIMO' | 'MEDIO' | 'ALTO' | 'CRITICO';
  curva_horaria: Array<{
    hora: number;
    franja: string;
    demanda_estimada: number;
    ocupacion_porcentaje: number;
    estado: 'DISPONIBLE' | 'OCUPACION_MODERADA' | 'SATURADO';
  }>;
  recomendaciones_operativas: string[];
}

export interface SimulacionColasResultado {
  fallback_local: boolean;
  lambda_llegadas: number;
  mu_servicio: number;
  c_servidores: number;
  factor_utilizacion_rho: number;
  porcentaje_utilizacion: number;
  p0_sistema_vacio: number;
  prob_espera_erlang_c: number;
  lq_estudiantes_en_cola: number;
  wq_minutos_espera_cola: number;
  w_minutos_tiempo_total: number;
  l_estudiantes_en_sistema: number;
  prob_espera_exceda_tolerancia?: number;
  nivel_saturacion: 'OPTIMO' | 'ESTABLE' | 'ALTO' | 'SATURADO';
  sistema_estable: boolean;
  servidores_minimos_recomendados?: number;
  recomendacion: string;
}

@Injectable()
export class AnalyticsFastApiClient {
  private readonly logger = new Logger(AnalyticsFastApiClient.name);
  private readonly fastApiBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.fastApiBaseUrl =
      this.configService.get<string>('FASTAPI_ANALYTICS_URL') ||
      'http://localhost:8001/api/v1/ml';
  }

  /**
   * Verifica la conectividad con el microservicio FastAPI
   */
  async checkHealth(): Promise<{ online: boolean; url: string; detalle?: any }> {
    const healthUrl = `${this.fastApiBaseUrl.replace(/\/api\/v1\/ml$/, '')}/health`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1800);
      timeout.unref?.();
      const res = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        return { online: true, url: healthUrl, detalle: json };
      }
      return { online: false, url: healthUrl };
    } catch {
      return { online: false, url: healthUrl };
    }
  }

  /**
   * Consulta la predicción de demanda a FastAPI o ejecuta el algoritmo analítico local
   */
  async predecirDemanda(
    dto: ConsultarPrediccionDto,
  ): Promise<PrediccionDemandaResultado> {
    const endpoint = `${this.fastApiBaseUrl}/predecir-demanda`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      timeout.unref?.();

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        return {
          ...data,
          fallback_local: false,
        };
      }
      this.logger.warn(
        `FastAPI respondió status ${res.status}. Conmutando a fallback autónomo local.`,
      );
      return this.ejecutarProyeccionDemandaLocal(dto);
    } catch (err: any) {
      this.logger.warn(
        `FastAPI no disponible en ${endpoint} (${err?.message || 'Error de conexión'}). Utilizando motor analítico local en TypeScript.`,
      );
      return this.ejecutarProyeccionDemandaLocal(dto);
    }
  }

  /**
   * Consulta la simulación de colas M/M/c a FastAPI o ejecuta Erlang-C localmente
   */
  async simularColas(
    dto: SimularColasDto,
  ): Promise<SimulacionColasResultado> {
    const endpoint = `${this.fastApiBaseUrl}/simular-colas`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      timeout.unref?.();

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        return {
          ...data,
          fallback_local: false,
        };
      }
      this.logger.warn(
        `FastAPI respondió status ${res.status}. Conmutando a simulación local Erlang-C.`,
      );
      return this.ejecutarSimulacionColasLocal(dto);
    } catch (err: any) {
      this.logger.warn(
        `FastAPI no disponible en ${endpoint} (${err?.message || 'Error de conexión'}). Utilizando simulación analítica Erlang-C local.`,
      );
      return this.ejecutarSimulacionColasLocal(dto);
    }
  }

  // =========================================================================
  // MOTOR ANALÍTICO LOCAL RESILIENTE (TypeScript Math Fallback)
  // =========================================================================

  /**
   * Cálculo matemático del modelo de colas M/M/c (Erlang-C exacto)
   */
  public ejecutarSimulacionColasLocal(
    dto: SimularColasDto,
  ): SimulacionColasResultado {
    const lambda = Number(dto.lambda_llegadas);
    const mu = Number(dto.mu_servicio);
    const c = Math.max(1, Math.floor(Number(dto.c_servidores)));
    const toleranciaMin = dto.tolerancia_espera_min
      ? Number(dto.tolerancia_espera_min)
      : undefined;

    const r = lambda / mu; // Intensidad de tráfico en Erlangs
    const rho = r / c; // Factor de utilización por servidor

    // Si el factor de utilización es >= 1, el sistema es saturado e inestable
    if (rho >= 1.0) {
      const cRecomendado = Math.ceil(r) + 1;
      return {
        fallback_local: true,
        lambda_llegadas: lambda,
        mu_servicio: mu,
        c_servidores: c,
        factor_utilizacion_rho: Number(rho.toFixed(4)),
        porcentaje_utilizacion: Number((rho * 100).toFixed(1)),
        p0_sistema_vacio: 0,
        prob_espera_erlang_c: 1.0,
        lq_estudiantes_en_cola: Number((lambda * 2.5).toFixed(1)), // Estimación de acumulación crítica
        wq_minutos_espera_cola: 120.0,
        w_minutos_tiempo_total: Number((120.0 + (1 / mu) * 60).toFixed(1)),
        l_estudiantes_en_sistema: Number((lambda * 2.5 + c).toFixed(1)),
        prob_espera_exceda_tolerancia: 1.0,
        nivel_saturacion: 'SATURADO',
        sistema_estable: false,
        servidores_minimos_recomendados: cRecomendado,
        recomendacion: `El ritmo de llegada de estudiantes (${lambda} est/h) excede la capacidad de atención instalada (${(c * mu).toFixed(1)} est/h). Se sugiere habilitar al menos ${cRecomendado} puestos o derivar usuarios a salas adyacentes.`,
      };
    }

    // Factorial con manejo seguro
    const factorial = (n: number): number => {
      let f = 1;
      for (let i = 2; i <= n; i++) f *= i;
      return f;
    };

    // Sumatoria para P0: sum_{k=0}^{c-1} (r^k / k!)
    let sumaK = 0;
    for (let k = 0; k < c; k++) {
      sumaK += Math.pow(r, k) / factorial(k);
    }

    // Término c: (r^c / (c! * (1 - rho)))
    const terminoC = Math.pow(r, c) / (factorial(c) * (1 - rho));

    // Probabilidad de sistema vacío P0
    const p0 = 1 / (sumaK + terminoC);

    // Probabilidad de espera Erlang-C: C(c, r) = terminoC * P0
    const probEspera = Math.min(1, Math.max(0, terminoC * p0));

    // Número medio en cola Lq = (P_espera * rho) / (1 - rho)
    const lq = (probEspera * rho) / (1 - rho);

    // Tiempo medio de espera en cola Wq (horas) = Lq / lambda -> minutos = Wq * 60
    const wqHoras = lq / lambda;
    const wqMinutos = wqHoras * 60;

    // Tiempo medio total en el sistema W (horas) = Wq + 1/mu -> minutos
    const wHoras = wqHoras + 1 / mu;
    const wMinutos = wHoras * 60;

    // Número medio de alumnos en el sistema L = lambda * W = Lq + r
    const l = lq + r;

    // Probabilidad de esperar más de tolerancia_min: P(Wq > t) = probEspera * e^(-c*mu*(1-rho)*t)
    let probExceda: number | undefined = undefined;
    if (toleranciaMin !== undefined && toleranciaMin >= 0) {
      const tHoras = toleranciaMin / 60;
      probExceda = Number(
        (probEspera * Math.exp(-c * mu * (1 - rho) * tHoras)).toFixed(4),
      );
    }

    let nivelSaturacion: 'OPTIMO' | 'ESTABLE' | 'ALTO' | 'SATURADO' = 'OPTIMO';
    if (rho >= 0.85) nivelSaturacion = 'ALTO';
    else if (rho >= 0.65) nivelSaturacion = 'ESTABLE';

    let recomendacion = 'Operación en rangos óptimos. Flujo de estudiantes sin demoras críticas.';
    if (nivelSaturacion === 'ALTO') {
      recomendacion = `Nivel de utilización elevado (${(rho * 100).toFixed(1)}%). El tiempo medio en cola es de ${wqMinutos.toFixed(1)} min. Monitorear disponibilidad de estaciones.`;
    } else if (nivelSaturacion === 'ESTABLE') {
      recomendacion = `Operación estable. Capacidad utilizada al ${(rho * 100).toFixed(1)}% con un tiempo medio de espera de ${wqMinutos.toFixed(1)} min.`;
    }

    return {
      fallback_local: true,
      lambda_llegadas: lambda,
      mu_servicio: mu,
      c_servidores: c,
      factor_utilizacion_rho: Number(rho.toFixed(4)),
      porcentaje_utilizacion: Number((rho * 100).toFixed(1)),
      p0_sistema_vacio: Number(p0.toFixed(6)),
      prob_espera_erlang_c: Number(probEspera.toFixed(4)),
      lq_estudiantes_en_cola: Number(lq.toFixed(2)),
      wq_minutos_espera_cola: Number(wqMinutos.toFixed(2)),
      w_minutos_tiempo_total: Number(wMinutos.toFixed(2)),
      l_estudiantes_en_sistema: Number(l.toFixed(2)),
      prob_espera_exceda_tolerancia: probExceda,
      nivel_saturacion: nivelSaturacion,
      sistema_estable: true,
      recomendacion,
    };
  }

  /**
   * Proyección analítica de demanda horaria basada en el perfil facultativo FCEE
   */
  public ejecutarProyeccionDemandaLocal(
    dto: ConsultarPrediccionDto,
  ): PrediccionDemandaResultado {
    const capacidad = dto.capacidad_sala || 24;
    const esExamenes = !!dto.es_semana_examenes;
    const horaInicio = dto.hora_inicio !== undefined ? dto.hora_inicio : 7;
    const horaFin = dto.hora_fin !== undefined ? dto.hora_fin : 22;
    const fecha = dto.fecha || new Date().toISOString().split('T')[0];

    // Factor horario normalizado para actividades académicas en la FCEE
    const factorHorario: Record<number, number> = {
      7: 0.35,
      8: 0.62,
      9: 0.88,
      10: 0.96, // Pico matutino
      11: 0.89,
      12: 0.52, // Almuerzo
      13: 0.44,
      14: 0.68,
      15: 0.86,
      16: 0.94, // Pico vespertino
      17: 0.88,
      18: 0.74,
      19: 0.82, // Turno noche
      20: 0.61,
      21: 0.32,
    };

    const factorMultiplicador = esExamenes ? 1.25 : 1.0;
    const curvaHoraria: Array<{
      hora: number;
      franja: string;
      demanda_estimada: number;
      ocupacion_porcentaje: number;
      estado: 'DISPONIBLE' | 'OCUPACION_MODERADA' | 'SATURADO';
    }> = [];
    let sumaDemanda = 0;
    let picoMax = 0;
    let horaPico = horaInicio;

    for (let h = horaInicio; h < horaFin; h++) {
      const baseFactor = factorHorario[h] !== undefined ? factorHorario[h] : 0.5;
      const demandaCalculada = Math.min(
        Math.round(capacidad * 1.3),
        Math.round(capacidad * baseFactor * factorMultiplicador),
      );

      const ocupacionPct = Math.min(
        100,
        Number(((demandaCalculada / capacidad) * 100).toFixed(1)),
      );

      let estado: 'DISPONIBLE' | 'OCUPACION_MODERADA' | 'SATURADO' = 'DISPONIBLE';
      if (ocupacionPct >= 85) estado = 'SATURADO';
      else if (ocupacionPct >= 50) estado = 'OCUPACION_MODERADA';

      if (demandaCalculada > picoMax) {
        picoMax = demandaCalculada;
        horaPico = h;
      }

      sumaDemanda += demandaCalculada;

      curvaHoraria.push({
        hora: h,
        franja: `${String(h).padStart(2, '0')}:00 - ${String(h + 1).padStart(2, '0')}:00`,
        demanda_estimada: demandaCalculada,
        ocupacion_porcentaje: ocupacionPct,
        estado,
      });
    }

    const cantidadHoras = Math.max(1, horaFin - horaInicio);
    const promedioDemanda = Number((sumaDemanda / cantidadHoras).toFixed(1));
    const tasaOcupacionGlobal = Math.min(
      100,
      Number(((promedioDemanda / capacidad) * 100).toFixed(1)),
    );

    let riesgo: 'OPTIMO' | 'MEDIO' | 'ALTO' | 'CRITICO' = 'OPTIMO';
    if (tasaOcupacionGlobal >= 85 || (picoMax >= capacidad && esExamenes)) {
      riesgo = 'CRITICO';
    } else if (tasaOcupacionGlobal >= 70) {
      riesgo = 'ALTO';
    } else if (tasaOcupacionGlobal >= 45) {
      riesgo = 'MEDIO';
    }

    const recomendaciones: string[] = [];
    if (riesgo === 'CRITICO') {
      recomendaciones.push(
        `Pico crítico detectado a las ${String(horaPico).padStart(2, '0')}:00 con ${picoMax} alumnos estimados superando la capacidad instalada (${capacidad} PCs). Habilitar sala de contingencia.`,
      );
      recomendaciones.push(
        'Activar cola de espera automática y restringir sesiones de uso libre a máximo 45 minutos.',
      );
    } else if (riesgo === 'ALTO') {
      recomendaciones.push(
        `Alta demanda entre las 09:00 y 11:00 y de 15:00 a 17:00. Mantener 100% de los puestos operativos.`,
      );
    } else {
      recomendaciones.push(
        'La demanda proyectada se mantiene en niveles confortables. Franjas entre 12:00-14:00 ideales para mantenimiento preventivo.',
      );
    }

    return {
      fallback_local: true,
      id_sala: dto.id_sala,
      fecha,
      capacidad_sala: capacidad,
      es_semana_examenes: esExamenes,
      demanda_promedio_estudiantes: promedioDemanda,
      pico_maximo_estudiantes: picoMax,
      hora_pico_maximo: horaPico,
      tasa_ocupacion_proyectada: tasaOcupacionGlobal,
      nivel_riesgo_saturacion: riesgo,
      curva_horaria: curvaHoraria,
      recomendaciones_operativas: recomendaciones,
    };
  }
}
