import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { MetricasRamsService } from './metricas-rams.service';
import { IndicadorConfiabilidadRAMS } from '../entities/indicador-rams.entity';
import {
  MantenimientoTaller,
  EstadoMantenimiento,
} from '../entities/mantenimiento-taller.entity';
import { Computadora } from '../../infraestructura/entities/computadora.entity';
import { LaboratorioSala } from '../../infraestructura/entities/laboratorio-sala.entity';

describe('MetricasRamsService (Fórmulas Matemáticas MTBF, MTTR y Disponibilidad A)', () => {
  let service: MetricasRamsService;
  let mockIndicadorRepo: any;
  let mockMantenimientoRepo: any;
  let mockComputadoraRepo: any;
  let mockSalaRepo: any;

  beforeEach(async () => {
    mockIndicadorRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((dto) => ({
        id_indicador: 1,
        ...dto,
      })),
      save: jest.fn().mockImplementation((i) => Promise.resolve(i)),
    };

    mockMantenimientoRepo = {
      find: jest.fn(),
    };

    mockComputadoraRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };

    mockSalaRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricasRamsService,
        {
          provide: getRepositoryToken(IndicadorConfiabilidadRAMS),
          useValue: mockIndicadorRepo,
        },
        {
          provide: getRepositoryToken(MantenimientoTaller),
          useValue: mockMantenimientoRepo,
        },
        {
          provide: getRepositoryToken(Computadora),
          useValue: mockComputadoraRepo,
        },
        {
          provide: getRepositoryToken(LaboratorioSala),
          useValue: mockSalaRepo,
        },
      ],
    }).compile();

    service = module.get<MetricasRamsService>(MetricasRamsService);
  });

  it('debe estar definido el servicio de métricas RAMS', () => {
    expect(service).toBeDefined();
  });

  describe('calcularMetricasComputadora', () => {
    it('debe calcular Disponibilidad A = 1.0 (100%) y MTTR = 0 cuando no hay fallas en el periodo', async () => {
      mockComputadoraRepo.findOne.mockResolvedValue({
        id_computadora: 10,
        id_sala: 1,
        codigo_equipo: 'PC-10',
      });

      mockMantenimientoRepo.find.mockResolvedValue([]);
      mockIndicadorRepo.findOne.mockResolvedValue(null);

      const res = await service.calcularMetricasComputadora(10, 10, 2026);

      expect(res.cant_fallas_registradas).toBe(0);
      expect(res.mttr_horas).toBe(0);
      expect(res.disponibilidad_operativa_a).toBe(1.0);
      expect(res.mtbf_horas).toBeGreaterThan(0);
    });

    it('debe calcular MTTR, MTBF y Disponibilidad A correctamente con fallas e intervenciones registradas', async () => {
      mockComputadoraRepo.findOne.mockResolvedValue({
        id_computadora: 10,
        id_sala: 1,
        codigo_equipo: 'PC-10',
      });

      // 2 fallas en el mes: una de 2.0 hrs y otra de 4.0 hrs -> total parada = 6.0 hrs
      mockMantenimientoRepo.find.mockResolvedValue([
        {
          id_mantenimiento: 1,
          duracion_taller_horas: 2.0,
          estado: EstadoMantenimiento.RETORNADO_A_SALA,
        },
        {
          id_mantenimiento: 2,
          duracion_taller_horas: 4.0,
          estado: EstadoMantenimiento.RETORNADO_A_SALA,
        },
      ]);

      mockIndicadorRepo.findOne.mockResolvedValue(null);

      const res = await service.calcularMetricasComputadora(10, 10, 2026);

      expect(res.cant_fallas_registradas).toBe(2);
      expect(res.horas_parada_totales).toBe(6.0);
      // MTTR = 6.0 / 2 = 3.0
      expect(res.mttr_horas).toBe(3.0);
      // MTBF = (372 - 6) / 2 = 366 / 2 = 183.0 (en octubre hay 31 días * 12 = 372 hrs)
      expect(res.mtbf_horas).toBe(183.0);
      // Disponibilidad A = 183 / (183 + 3) = 183 / 186 = 0.9839
      expect(res.disponibilidad_operativa_a).toBe(0.9839);
    });

    it('debe lanzar NotFoundException si la computadora no existe', async () => {
      mockComputadoraRepo.findOne.mockResolvedValue(null);

      await expect(
        service.calcularMetricasComputadora(999, 10, 2026),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('calcularMetricasSala', () => {
    it('debe consolidar métricas de todas las computadoras de una sala', async () => {
      mockSalaRepo.findOne.mockResolvedValue({
        id_sala: 1,
        codigo_sala: 'LAB-01',
        nombre: 'Laboratorio de Finanzas LAB-01',
        computadoras: [
          { id_computadora: 1, id_sala: 1 },
          { id_computadora: 2, id_sala: 1 },
        ],
      });

      mockComputadoraRepo.findOne
        .mockResolvedValueOnce({ id_computadora: 1, id_sala: 1 })
        .mockResolvedValueOnce({ id_computadora: 2, id_sala: 1 });

      mockMantenimientoRepo.find.mockResolvedValue([]);
      mockIndicadorRepo.findOne.mockResolvedValue(null);

      const res = await service.calcularMetricasSala(1, 10, 2026);

      expect(res.id_sala).toBe(1);
      expect(res.codigo_sala).toBe('LAB-01');
      expect(res.cant_equipos).toBe(2);
      expect(res.cant_fallas).toBe(0);
      expect(res.disponibilidad_promedio).toBe(1.0);
      expect(res.disponibilidad_porcentaje).toBe(100);
      expect(res.indicadores.length).toBe(2);
    });
  });

  describe('getDashboardRAMS', () => {
    it('debe retornar KPIs globales, resumen por sala y lista de equipos críticos', async () => {
      mockSalaRepo.find.mockResolvedValue([
        {
          id_sala: 1,
          codigo_sala: 'LAB-01',
          nombre: 'LAB-01',
          computadoras: [{ id_computadora: 1, id_sala: 1 }],
        },
      ]);
      mockSalaRepo.findOne.mockResolvedValue({
        id_sala: 1,
        codigo_sala: 'LAB-01',
        nombre: 'LAB-01',
        computadoras: [{ id_computadora: 1, id_sala: 1 }],
      });

      mockComputadoraRepo.findOne.mockResolvedValue({
        id_computadora: 1,
        id_sala: 1,
      });

      mockComputadoraRepo.find.mockResolvedValue([
        { id_computadora: 1, activo: true, estado_actual: 'DISPONIBLE' },
        { id_computadora: 2, activo: true, estado_actual: 'EN_MANTENIMIENTO' },
      ]);

      mockMantenimientoRepo.find.mockResolvedValue([]);
      mockIndicadorRepo.findOne.mockResolvedValue(null);
      mockIndicadorRepo.find.mockResolvedValue([]);

      const dash = await service.getDashboardRAMS();

      expect(dash).toHaveProperty('kpis');
      expect(dash.kpis.total_equipos_parque).toBe(2);
      expect(dash.kpis.total_equipos_operativos).toBe(1);
      expect(dash.kpis.total_equipos_en_taller).toBe(1);
      expect(dash).toHaveProperty('resumen_salas');
      expect(dash).toHaveProperty('equipos_criticos');
    });
  });
});
