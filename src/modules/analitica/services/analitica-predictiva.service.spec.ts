import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnaliticaPredictivaService } from './analitica-predictiva.service';
import { AnalyticsFastApiClient } from '../clients/analytics-fastapi.client';
import {
  EjecucionMl,
  TipoOperacionMl,
} from '../entities/ejecucion-ml.entity';
import { LaboratorioSala } from '../../infraestructura/entities/laboratorio-sala.entity';
import { AuditoriaService } from '../../auditoria/auditoria.service';

describe('AnaliticaPredictivaService (CU26: Machine Learning y Simulación de Colas M/M/c)', () => {
  let service: AnaliticaPredictivaService;
  let client: AnalyticsFastApiClient;
  let mockEjecucionRepo: any;
  let mockSalaRepo: any;
  let mockAuditoriaService: any;

  beforeEach(async () => {
    mockEjecucionRepo = {
      create: jest.fn().mockImplementation((dto) => ({
        id_ejecucion: 100,
        ...dto,
      })),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            id_ejecucion: 1,
            tipo_operacion: TipoOperacionMl.PREDICCION_DEMANDA,
            id_sala: 1,
            fecha_ejecucion: new Date(),
            usuario: { id_usuario: 1, nombres: 'Admin', password_hash: 'secret' },
          },
        ]),
      }),
    };

    mockSalaRepo = {
      findOne: jest.fn().mockResolvedValue({
        id_sala: 1,
        codigo_sala: 'LAB-01',
        nombre: 'Laboratorio CITEF 1',
        cant_estudiantes: 24,
        computadoras: [{ id_computadora: 1 }, { id_computadora: 2 }],
      }),
    };

    mockAuditoriaService = {
      registrar: jest.fn().mockResolvedValue({ id_auditoria: 1 }),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('http://localhost:8001/api/v1/ml'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnaliticaPredictivaService,
        AnalyticsFastApiClient,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(EjecucionMl),
          useValue: mockEjecucionRepo,
        },
        {
          provide: getRepositoryToken(LaboratorioSala),
          useValue: mockSalaRepo,
        },
        {
          provide: AuditoriaService,
          useValue: mockAuditoriaService,
        },
      ],
    }).compile();

    service = module.get<AnaliticaPredictivaService>(AnaliticaPredictivaService);
    client = module.get<AnalyticsFastApiClient>(AnalyticsFastApiClient);
  });

  it('debe estar definido el servicio y su cliente predictivo', () => {
    expect(service).toBeDefined();
    expect(client).toBeDefined();
  });

  describe('predecirDemanda', () => {
    it('debe calcular la proyección horaria con fallback local autónomo y persistir trazabilidad', async () => {
      const dto = {
        id_sala: 1,
        fecha: '2026-04-20',
        es_semana_examenes: false,
      };

      const res = await service.predecirDemanda(dto, 1);

      expect(res).toBeDefined();
      expect(res.fallback_local).toBe(true);
      expect(res.id_sala).toBe(1);
      expect(res.curva_horaria.length).toBeGreaterThan(0);
      expect(res.curva_horaria[0]).toHaveProperty('demanda_estimada');
      expect(res.curva_horaria[0]).toHaveProperty('ocupacion_porcentaje');
      expect(res.id_ejecucion).toBe(100);
      expect(res.tiempo_respuesta_ms).toBeGreaterThanOrEqual(0);

      // Verificación de base de datos y auditoría forense
      expect(mockEjecucionRepo.save).toHaveBeenCalled();
      expect(mockAuditoriaService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'EJECUTAR_PREDICCION_DEMANDA_ML',
          tabla_afectada: 'ejecucion_ml',
        }),
      );
    });

    it('debe aplicar incremento de demanda en semana de exámenes', async () => {
      const normal = await service.predecirDemanda(
        { id_sala: 1, es_semana_examenes: false },
        1,
      );
      const examenes = await service.predecirDemanda(
        { id_sala: 1, es_semana_examenes: true },
        1,
      );

      expect(examenes.pico_maximo_estudiantes).toBeGreaterThanOrEqual(
        normal.pico_maximo_estudiantes,
      );
    });

    it('debe lanzar NotFoundException si la sala no existe', async () => {
      mockSalaRepo.findOne.mockResolvedValue(null);

      await expect(
        service.predecirDemanda({ id_sala: 999 }, 1),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('simularColas (Modelo Erlang-C)', () => {
    it('debe calcular métricas exactas M/M/c con sistema estable (rho < 1)', async () => {
      const dto = {
        lambda_llegadas: 15.0, // 15 alumnos/hora
        mu_servicio: 1.5, // 1.5 alumnos/hora por máquina
        c_servidores: 12, // 12 computadoras -> capacidad = 18 alumnos/hora
        tolerancia_espera_min: 10,
      };

      const res = await service.simularColas(dto, 1);

      expect(res).toBeDefined();
      expect(res.fallback_local).toBe(true);
      expect(res.factor_utilizacion_rho).toBeLessThan(1.0);
      expect(res.factor_utilizacion_rho).toBeCloseTo(15 / 18, 2);
      expect(res.sistema_estable).toBe(true);
      expect(res.p0_sistema_vacio).toBeGreaterThanOrEqual(0);
      expect(res.prob_espera_erlang_c).toBeGreaterThanOrEqual(0);
      expect(res.prob_espera_erlang_c).toBeLessThanOrEqual(1.0);
      expect(res.wq_minutos_espera_cola).toBeGreaterThanOrEqual(0);
      expect(res.w_minutos_tiempo_total).toBeGreaterThan(
        res.wq_minutos_espera_cola,
      );
      expect(res.prob_espera_exceda_tolerancia).toBeDefined();

      expect(mockEjecucionRepo.save).toHaveBeenCalled();
      expect(mockAuditoriaService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'EJECUTAR_SIMULACION_COLAS_MMC',
        }),
      );
    });

    it('debe detectar saturación (rho >= 1) y alertar sobrecarga con servidores recomendados', async () => {
      const dto = {
        lambda_llegadas: 30.0, // 30 alumnos/hora
        mu_servicio: 1.0,
        c_servidores: 20, // 20 puestos -> rho = 1.5 (SATURADO)
      };

      const res = await service.simularColas(dto, 1);

      expect(res.factor_utilizacion_rho).toBeGreaterThanOrEqual(1.0);
      expect(res.sistema_estable).toBe(false);
      expect(res.nivel_saturacion).toBe('SATURADO');
      expect(res.servidores_minimos_recomendados).toBeGreaterThan(20);
      expect(res.recomendacion).toContain('excede la capacidad');
    });
  });

  describe('getHistorialEjecuciones', () => {
    it('debe retornar histórico sin exponer hashes de contraseñas de usuarios', async () => {
      const historial = await service.getHistorialEjecuciones();

      expect(historial).toHaveLength(1);
      expect((historial[0].usuario as any)?.password_hash).toBeUndefined();
    });
  });

  describe('checkFastApiHealth', () => {
    it('debe retornar estado offline con fallback activo si FastAPI no está corriendo', async () => {
      const health = await service.checkFastApiHealth();
      expect(health).toBeDefined();
      expect(health.url).toContain('http://localhost:8001');
    });
  });
});
