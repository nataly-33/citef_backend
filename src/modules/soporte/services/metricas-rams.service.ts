import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { IndicadorConfiabilidadRAMS } from '../entities/indicador-rams.entity';
import {
  MantenimientoTaller,
  EstadoMantenimiento,
} from '../entities/mantenimiento-taller.entity';
import { Computadora } from '../../infraestructura/entities/computadora.entity';
import { LaboratorioSala } from '../../infraestructura/entities/laboratorio-sala.entity';

export interface ResumenRamsSala {
  id_sala: number;
  codigo_sala: string;
  nombre_sala: string;
  cant_equipos: number;
  cant_fallas: number;
  mtbf_promedio: number;
  mttr_promedio: number;
  disponibilidad_promedio: number;
  disponibilidad_porcentaje: number;
}

export interface KpisRamsDashboard {
  mtbf_promedio_horas: number;
  mttr_promedio_horas: number;
  disponibilidad_promedio_factor: number;
  disponibilidad_promedio_porcentaje: number;
  total_equipos_parque: number;
  total_equipos_operativos: number;
  total_equipos_en_taller: number;
  total_equipos_baja: number;
  total_fallas_periodo: number;
  periodo_mes: number;
  periodo_anio: number;
}

@Injectable()
export class MetricasRamsService {
  private readonly logger = new Logger(MetricasRamsService.name);

  constructor(
    @InjectRepository(IndicadorConfiabilidadRAMS)
    private readonly indicadorRepo: Repository<IndicadorConfiabilidadRAMS>,
    @InjectRepository(MantenimientoTaller)
    private readonly mantenimientoRepo: Repository<MantenimientoTaller>,
    @InjectRepository(Computadora)
    private readonly computadoraRepo: Repository<Computadora>,
    @InjectRepository(LaboratorioSala)
    private readonly salaRepo: Repository<LaboratorioSala>,
  ) {}

  /**
   * Calcula y persiste las métricas RAMS de una computadora específica
   * para un mes y año dados (por defecto, mes y año actuales).
   */
  async calcularMetricasComputadora(
    idComputadora: number,
    mes?: number,
    anio?: number,
  ): Promise<IndicadorConfiabilidadRAMS> {
    const pc = await this.computadoraRepo.findOne({
      where: { id_computadora: idComputadora },
      relations: { sala: true },
    });

    if (!pc) {
      throw new NotFoundException(
        `Computadora con ID ${idComputadora} no encontrada`,
      );
    }

    const hoy = new Date();
    const periodoMes = mes ?? hoy.getMonth() + 1;
    const periodoAnio = anio ?? hoy.getFullYear();

    // Rango de fechas del mes
    const fechaInicio = new Date(
      Date.UTC(periodoAnio, periodoMes - 1, 1, 0, 0, 0),
    );
    const fechaFin = new Date(Date.UTC(periodoAnio, periodoMes, 1, 0, 0, 0));

    // Días del mes y horas base operativas (12 hrs/día estándar académico CITEF)
    const diasEnMes = new Date(periodoAnio, periodoMes, 0).getDate();
    const horasBaseMes = diasEnMes * 12;

    // Buscar mantenimientos del periodo para esta PC
    const mantenimientos = await this.mantenimientoRepo.find({
      where: {
        id_computadora: idComputadora,
        fecha_hora_ingreso: Between(fechaInicio, fechaFin),
      },
    });

    const cantFallas = mantenimientos.length;

    // Calcular horas de parada en taller
    let horasParadaTotales = 0;
    for (const m of mantenimientos) {
      if (
        m.duracion_taller_horas !== null &&
        m.duracion_taller_horas !== undefined
      ) {
        horasParadaTotales += Number(m.duracion_taller_horas);
      } else if (m.fecha_hora_fin_taller && m.fecha_hora_ingreso) {
        const ms =
          new Date(m.fecha_hora_fin_taller).getTime() -
          new Date(m.fecha_hora_ingreso).getTime();
        const hrs = Math.max(0.1, ms / (1000 * 3600));
        horasParadaTotales += hrs;
      } else if (m.estado === EstadoMantenimiento.EN_REPARACION) {
        // En curso: horas transcurridas hasta ahora
        const ms = hoy.getTime() - new Date(m.fecha_hora_ingreso).getTime();
        const hrs = Math.max(0.1, ms / (1000 * 3600));
        horasParadaTotales += hrs;
      }
    }
    horasParadaTotales = Math.round(horasParadaTotales * 100) / 100;

    const horasOperativasTotales = Math.max(
      0,
      Math.round((horasBaseMes - horasParadaTotales) * 100) / 100,
    );

    let mtbfHoras = horasOperativasTotales;
    let mttrHoras = 0;
    let disponibilidadA = 1.0;

    if (cantFallas > 0) {
      mttrHoras = Math.round((horasParadaTotales / cantFallas) * 100) / 100;
      mtbfHoras = Math.round((horasOperativasTotales / cantFallas) * 100) / 100;
      const suma = mtbfHoras + mttrHoras;
      disponibilidadA =
        suma > 0 ? Math.round((mtbfHoras / suma) * 10000) / 10000 : 1.0;
    }

    // Upsert indicador RAMS
    let indicador = await this.indicadorRepo.findOne({
      where: {
        id_computadora: idComputadora,
        periodo_mes: periodoMes,
        periodo_anio: periodoAnio,
      },
    });

    if (indicador) {
      indicador.cant_fallas_registradas = cantFallas;
      indicador.horas_operativas_totales = horasOperativasTotales;
      indicador.horas_parada_totales = horasParadaTotales;
      indicador.mtbf_horas = mtbfHoras;
      indicador.mttr_horas = mttrHoras;
      indicador.disponibilidad_operativa_a = disponibilidadA;
      indicador.id_sala = pc.id_sala;
    } else {
      indicador = this.indicadorRepo.create({
        id_computadora: idComputadora,
        id_sala: pc.id_sala,
        periodo_mes: periodoMes,
        periodo_anio: periodoAnio,
        cant_fallas_registradas: cantFallas,
        horas_operativas_totales: horasOperativasTotales,
        horas_parada_totales: horasParadaTotales,
        mtbf_horas: mtbfHoras,
        mttr_horas: mttrHoras,
        disponibilidad_operativa_a: disponibilidadA,
      });
    }

    return this.indicadorRepo.save(indicador);
  }

  /**
   * Recalcula y consolida indicadores RAMS para todas las computadoras de una sala.
   */
  async calcularMetricasSala(
    idSala: number,
    mes?: number,
    anio?: number,
  ): Promise<ResumenRamsSala & { indicadores: IndicadorConfiabilidadRAMS[] }> {
    const sala = await this.salaRepo.findOne({
      where: { id_sala: idSala },
      relations: { computadoras: true },
    });

    if (!sala) {
      throw new NotFoundException(`Sala con ID ${idSala} no encontrada`);
    }

    const pcs = sala.computadoras || [];
    const indicadores: IndicadorConfiabilidadRAMS[] = [];

    for (const pc of pcs) {
      const ind = await this.calcularMetricasComputadora(
        pc.id_computadora,
        mes,
        anio,
      );
      indicadores.push(ind);
    }

    const cantEquipos = pcs.length;
    const cantFallasTotal = indicadores.reduce(
      (acc, cur) => acc + (cur.cant_fallas_registradas || 0),
      0,
    );

    const mtbfPromedio =
      cantEquipos > 0
        ? Math.round(
            (indicadores.reduce((acc, cur) => acc + Number(cur.mtbf_horas), 0) /
              cantEquipos) *
              100,
          ) / 100
        : 0;

    const mttrPromedio =
      cantEquipos > 0
        ? Math.round(
            (indicadores.reduce((acc, cur) => acc + Number(cur.mttr_horas), 0) /
              cantEquipos) *
              100,
          ) / 100
        : 0;

    const dispPromedio =
      cantEquipos > 0
        ? Math.round(
            (indicadores.reduce(
              (acc, cur) => acc + Number(cur.disponibilidad_operativa_a),
              0,
            ) /
              cantEquipos) *
              10000,
          ) / 10000
        : 1.0;

    return {
      id_sala: sala.id_sala,
      codigo_sala: sala.codigo_sala,
      nombre_sala: sala.nombre,
      cant_equipos: cantEquipos,
      cant_fallas: cantFallasTotal,
      mtbf_promedio: mtbfPromedio,
      mttr_promedio: mttrPromedio,
      disponibilidad_promedio: dispPromedio,
      disponibilidad_porcentaje: Math.round(dispPromedio * 10000) / 100,
      indicadores,
    };
  }

  /**
   * Retorna el tablero consolidado de métricas RAMS (KPIs gerenciales,
   * desglose por sala y máquinas con mayor criticidad/menor disponibilidad).
   */
  async getDashboardRAMS(params?: {
    id_sala?: number;
    mes?: number;
    anio?: number;
  }) {
    const hoy = new Date();
    const periodoMes = params?.mes ?? hoy.getMonth() + 1;
    const periodoAnio = params?.anio ?? hoy.getFullYear();

    // Salas a evaluar
    let salas: LaboratorioSala[] = [];
    if (params?.id_sala) {
      const s = await this.salaRepo.findOne({
        where: { id_sala: params.id_sala },
        relations: { computadoras: true },
      });
      if (s) salas = [s];
    } else {
      salas = await this.salaRepo.find({
        where: { activo: true },
        relations: { computadoras: true },
        order: { codigo_sala: 'ASC' },
      });
    }

    const resumenSalas: ResumenRamsSala[] = [];
    const todosIndicadores: IndicadorConfiabilidadRAMS[] = [];

    for (const sala of salas) {
      const resSala = await this.calcularMetricasSala(
        sala.id_sala,
        periodoMes,
        periodoAnio,
      );
      resumenSalas.push({
        id_sala: resSala.id_sala,
        codigo_sala: resSala.codigo_sala,
        nombre_sala: resSala.nombre_sala,
        cant_equipos: resSala.cant_equipos,
        cant_fallas: resSala.cant_fallas,
        mtbf_promedio: resSala.mtbf_promedio,
        mttr_promedio: resSala.mttr_promedio,
        disponibilidad_promedio: resSala.disponibilidad_promedio,
        disponibilidad_porcentaje: resSala.disponibilidad_porcentaje,
      });
      todosIndicadores.push(...resSala.indicadores);
    }

    // Conteos del parque de cómputo
    const pcsTodas = await this.computadoraRepo.find();
    const totalEquipos = pcsTodas.length;
    const totalOperativos = pcsTodas.filter(
      (pc) =>
        pc.activo &&
        (pc.estado_actual === 'DISPONIBLE' ||
          pc.estado_actual === 'OCUPADA' ||
          pc.estado_actual === 'RESERVADA'),
    ).length;
    const totalEnTaller = pcsTodas.filter(
      (pc) => pc.activo && pc.estado_actual === 'EN_MANTENIMIENTO',
    ).length;
    const totalBaja = pcsTodas.filter(
      (pc) => !pc.activo || pc.estado_actual === 'DE_BAJA',
    ).length;

    const totalFallasPeriodo = resumenSalas.reduce(
      (acc, cur) => acc + cur.cant_fallas,
      0,
    );

    const totalEquiposConIndicador = todosIndicadores.length;
    const mtbfGlobal =
      totalEquiposConIndicador > 0
        ? Math.round(
            (todosIndicadores.reduce(
              (acc, cur) => acc + Number(cur.mtbf_horas),
              0,
            ) /
              totalEquiposConIndicador) *
              100,
          ) / 100
        : 0;

    const mttrGlobal =
      totalEquiposConIndicador > 0
        ? Math.round(
            (todosIndicadores.reduce(
              (acc, cur) => acc + Number(cur.mttr_horas),
              0,
            ) /
              totalEquiposConIndicador) *
              100,
          ) / 100
        : 0;

    const dispGlobal =
      totalEquiposConIndicador > 0
        ? Math.round(
            (todosIndicadores.reduce(
              (acc, cur) => acc + Number(cur.disponibilidad_operativa_a),
              0,
            ) /
              totalEquiposConIndicador) *
              10000,
          ) / 10000
        : 1.0;

    // Equipos críticos (ordenados por menor disponibilidad y más fallas)
    const equiposConRelacion = await this.indicadorRepo.find({
      where: { periodo_mes: periodoMes, periodo_anio: periodoAnio },
      relations: { computadora: true, sala: true },
      order: {
        disponibilidad_operativa_a: 'ASC',
        cant_fallas_registradas: 'DESC',
      },
      take: 8,
    });

    const kpis: KpisRamsDashboard = {
      mtbf_promedio_horas: mtbfGlobal,
      mttr_promedio_horas: mttrGlobal,
      disponibilidad_promedio_factor: dispGlobal,
      disponibilidad_promedio_porcentaje: Math.round(dispGlobal * 10000) / 100,
      total_equipos_parque: totalEquipos,
      total_equipos_operativos: totalOperativos,
      total_equipos_en_taller: totalEnTaller,
      total_equipos_baja: totalBaja,
      total_fallas_periodo: totalFallasPeriodo,
      periodo_mes: periodoMes,
      periodo_anio: periodoAnio,
    };

    return {
      kpis,
      resumen_salas: resumenSalas,
      equipos_criticos: equiposConRelacion,
    };
  }
}
