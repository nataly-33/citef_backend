import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MetricasDashboardService } from './metricas-dashboard.service';
import { LaboratorioSala } from '../../infraestructura/entities/laboratorio-sala.entity';
import { Computadora } from '../../infraestructura/entities/computadora.entity';
import {
  ReservaSala,
  EstadoReserva,
  TipoReserva,
} from '../../reservas/entities/reserva-sala.entity';
import { AsignacionSesion } from '../../ocupacion/entities/asignacion-sesion.entity';
import { Carrera } from '../../catalogos/entities/carrera.entity';
import { AveriaEquipo } from '../../turnos/entities/averia-equipo.entity';

describe('MetricasDashboardService (CU27: KPIs y Gráficos Analíticos)', () => {
  let service: MetricasDashboardService;
  let mockSalaRepo: any;
  let mockComputadoraRepo: any;
  let mockReservaRepo: any;
  let mockSesionRepo: any;
  let mockCarreraRepo: any;
  let mockAveriaRepo: any;

  beforeEach(async () => {
    // QueryBuilder genérico para computadoras
    const compQb: any = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        { id_computadora: 1, id_sala: 1, estado_actual: 'OCUPADA', activo: true },
        { id_computadora: 2, id_sala: 1, estado_actual: 'DISPONIBLE', activo: true },
        { id_computadora: 3, id_sala: 1, estado_actual: 'EN_MANTENIMIENTO', activo: true },
        { id_computadora: 4, id_sala: 2, estado_actual: 'DISPONIBLE', activo: true },
      ]),
    };

    // QueryBuilder para reservas
    const resQb: any = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id_reserva: 1,
          hora_inicio: '08:00:00',
          hora_fin: '10:00:00',
          estado: EstadoReserva.APROBADA,
          tipo_reserva: TipoReserva.CLASE,
        },
        {
          id_reserva: 2,
          hora_inicio: '10:00:00',
          hora_fin: '12:00:00',
          estado: EstadoReserva.FINALIZADA,
          tipo_reserva: TipoReserva.EXAMEN,
        },
      ]),
      getCount: jest.fn().mockResolvedValue(5),
    };

    // QueryBuilder para sesiones
    const sesQb: any = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        { id_sesion: 1, minutos_permanencia: 60 },
        { id_sesion: 2, minutos_permanencia: 45 },
      ]),
    };

    mockComputadoraRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(compQb),
      find: jest.fn().mockResolvedValue([]),
    };

    mockReservaRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(resQb),
      find: jest.fn().mockResolvedValue([]),
    };

    mockSesionRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(sesQb),
      find: jest.fn().mockResolvedValue([]),
    };

    mockSalaRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id_sala: 1,
          codigo_sala: 'LAB-01',
          nombre: 'Laboratorio de Informática 1',
          cant_estudiantes: 24,
          activo: true,
          computadoras: [
            { estado_actual: 'OCUPADA' },
            { estado_actual: 'DISPONIBLE' },
          ],
        },
      ]),
    };

    mockCarreraRepo = {
      find: jest.fn().mockResolvedValue([
        { id_carrera: 1, codigo: '186-5', nombre: 'Ingeniería Comercial', activo: true },
        { id_carrera: 2, codigo: '186-2', nombre: 'Administración de Empresas', activo: true },
      ]),
    };

    mockAveriaRepo = {
      count: jest.fn().mockResolvedValue(2),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricasDashboardService,
        {
          provide: getRepositoryToken(LaboratorioSala),
          useValue: mockSalaRepo,
        },
        {
          provide: getRepositoryToken(Computadora),
          useValue: mockComputadoraRepo,
        },
        {
          provide: getRepositoryToken(ReservaSala),
          useValue: mockReservaRepo,
        },
        {
          provide: getRepositoryToken(AsignacionSesion),
          useValue: mockSesionRepo,
        },
        {
          provide: getRepositoryToken(Carrera),
          useValue: mockCarreraRepo,
        },
        {
          provide: getRepositoryToken(AveriaEquipo),
          useValue: mockAveriaRepo,
        },
      ],
    }).compile();

    service = module.get<MetricasDashboardService>(MetricasDashboardService);
  });

  it('debe estar definido el servicio de métricas del dashboard', () => {
    expect(service).toBeDefined();
  });

  describe('getKpisEjecutivos', () => {
    it('debe calcular los 6 KPIs estratégicos institucionales correctamente', async () => {
      const kpis = await service.getKpisEjecutivos({});

      expect(kpis).toBeDefined();
      expect(kpis.tasa_global_ocupacion).toBeGreaterThanOrEqual(0);
      expect(kpis.total_computadoras_activas).toBe(4);
      expect(kpis.total_computadoras_ocupadas).toBe(1);
      expect(kpis.total_horas_catedra_dictadas).toBe(4); // 2 + 2 horas
      expect(kpis.total_evaluaciones_prioritarias).toBe(5);
      expect(kpis.tiempo_promedio_permanencia_min).toBe(53); // (60 + 45)/2 = 52.5 redondeado
      expect(kpis.salud_parque_rams.total_equipos).toBe(4);
      expect(kpis.salud_parque_rams.operativos).toBe(3);
      expect(kpis.salud_parque_rams.en_mantenimiento).toBe(1);
      expect(kpis.salud_parque_rams.tasa_disponibilidad).toBe(75);
      expect(kpis.efectividad_mitigacion_algoritmica.conflictos_prevenidos).toBeGreaterThan(0);
      expect(kpis.fecha_corte).toBeDefined();
    });

    it('debe aplicar filtros por id_sala y rango de fechas', async () => {
      const kpis = await service.getKpisEjecutivos({
        id_sala: 1,
        fecha_inicio: '2026-03-01',
        fecha_fin: '2026-03-31',
      });

      expect(kpis).toBeDefined();
      expect(mockComputadoraRepo.createQueryBuilder).toHaveBeenCalled();
      expect(mockReservaRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('getGraficosDashboard', () => {
    it('debe retornar la batería completa de gráficos estadísticos', async () => {
      const graficos = await service.getGraficosDashboard({});

      expect(graficos).toBeDefined();

      // 1. Donut de carreras
      expect(graficos.distribucion_carreras_donut.length).toBeGreaterThan(0);
      expect(graficos.distribucion_carreras_donut[0]).toHaveProperty('carrera');
      expect(graficos.distribucion_carreras_donut[0]).toHaveProperty('porcentaje');

      // 2. Barras agrupadas por sala
      expect(graficos.aforo_ocupacion_por_sala_barras.length).toBeGreaterThan(0);
      expect(graficos.aforo_ocupacion_por_sala_barras[0]).toHaveProperty('codigo_sala');
      expect(graficos.aforo_ocupacion_por_sala_barras[0]).toHaveProperty('aforo_total');

      // 3. Afluencia por día de la semana (Lunes a Sábado)
      expect(graficos.afluencia_dias_semana_barras.length).toBe(6);
      expect(graficos.afluencia_dias_semana_barras[0].dia_nombre).toBe('Lunes');
      expect(graficos.afluencia_dias_semana_barras[5].dia_nombre).toBe('Sábado');

      // 4. Demanda horaria (07:00 a 22:00)
      expect(graficos.demanda_horaria_lineas.length).toBe(15);
      expect(graficos.demanda_horaria_lineas[0].hora).toBe(7);

      // 5. Matriz de calor heatmap (6 días x 15 horas = 90 celdas)
      expect(graficos.matriz_calor_heatmap.length).toBe(6 * 15);
      expect(graficos.matriz_calor_heatmap[0]).toHaveProperty('densidad_porcentaje');
      expect(graficos.matriz_calor_heatmap[0]).toHaveProperty('nivel_alerta');
    });
  });
});
