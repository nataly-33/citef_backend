import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SoporteService } from './soporte.service';
import { MetricasRamsService } from './metricas-rams.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { OcupacionGateway } from '../../ocupacion/gateways/ocupacion.gateway';
import {
  MantenimientoTaller,
  EstadoMantenimiento,
  TipoMantenimiento,
  PrioridadMantenimiento,
} from '../entities/mantenimiento-taller.entity';
import { ConfirmacionRetornoSala } from '../entities/confirmacion-retorno.entity';
import { IndicadorConfiabilidadRAMS } from '../entities/indicador-rams.entity';
import { Computadora } from '../../infraestructura/entities/computadora.entity';
import {
  AveriaEquipo,
  EstadoAveria,
  TipoFalla,
} from '../../turnos/entities/averia-equipo.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

describe('SoporteService (CU24: Mantenimiento en Taller & CU25: Retorno y RAMS)', () => {
  let service: SoporteService;
  let mockMantenimientoRepo: any;
  let mockRetornoRepo: any;
  let mockIndicadorRepo: any;
  let mockComputadoraRepo: any;
  let mockAveriaRepo: any;
  let mockUsuarioRepo: any;
  let mockAuditoriaService: any;
  let mockMetricasRamsService: any;
  let mockOcupacionGateway: any;
  let mockMantenimientoQb: any;
  let mockUsuarioQb: any;

  beforeEach(async () => {
    mockMantenimientoQb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([
        [
          {
            id_mantenimiento: 1,
            id_computadora: 5,
            estado: EstadoMantenimiento.PENDIENTE_TALLER,
            fecha_hora_ingreso: new Date(),
          },
        ],
        1,
      ]),
    };

    mockMantenimientoRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({
        id_mantenimiento: 1,
        ...dto,
      })),
      save: jest.fn().mockImplementation((m) =>
        Promise.resolve({
          id_mantenimiento: 1,
          ...m,
        }),
      ),
      createQueryBuilder: jest.fn().mockReturnValue(mockMantenimientoQb),
    };

    mockRetornoRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({
        id_retorno: 1,
        ...dto,
      })),
      save: jest.fn().mockImplementation((r) =>
        Promise.resolve({
          id_retorno: 1,
          ...r,
        }),
      ),
    };

    mockIndicadorRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({
        id_indicador: 1,
        ...dto,
      })),
      save: jest.fn().mockImplementation((i) =>
        Promise.resolve({
          id_indicador: 1,
          ...i,
        }),
      ),
    };

    mockComputadoraRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn().mockImplementation((c) => Promise.resolve(c)),
    };

    mockAveriaRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((a) => Promise.resolve(a)),
    };

    mockUsuarioQb = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id_usuario: 3,
          nombres: 'CARLOS',
          apellidos: 'PEREZ',
          correo_institucional: 'carlos@uagrm.edu.bo',
          password_hash: 'secret',
          activo: true,
        },
      ]),
    };

    mockUsuarioRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockUsuarioQb),
    };

    mockAuditoriaService = {
      registrar: jest.fn().mockResolvedValue({ id_auditoria: 1 }),
    };

    mockMetricasRamsService = {
      calcularMetricasComputadora: jest.fn().mockResolvedValue({
        id_indicador: 1,
        id_computadora: 5,
        mtbf_horas: 357.5,
        mttr_horas: 2.5,
        disponibilidad_operativa_a: 0.9931,
      }),
      calcularMetricasSala: jest.fn().mockResolvedValue({
        id_sala: 1,
        codigo_sala: 'LAB-01',
        cant_equipos: 24,
        mtbf_promedio: 350.0,
        mttr_promedio: 2.1,
        disponibilidad_promedio: 0.994,
        disponibilidad_porcentaje: 99.4,
      }),
      getDashboardRAMS: jest.fn().mockResolvedValue({
        kpis: {
          mtbf_promedio_horas: 350.0,
          mttr_promedio_horas: 2.5,
          disponibilidad_promedio_factor: 0.9929,
          disponibilidad_promedio_porcentaje: 99.29,
          total_equipos_parque: 40,
          total_equipos_operativos: 38,
          total_equipos_en_taller: 2,
          total_equipos_baja: 0,
          total_fallas_periodo: 2,
        },
        resumen_salas: [],
        equipos_criticos: [],
      }),
    };

    mockOcupacionGateway = {
      emitirActualizacionSala: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SoporteService,
        {
          provide: getRepositoryToken(MantenimientoTaller),
          useValue: mockMantenimientoRepo,
        },
        {
          provide: getRepositoryToken(ConfirmacionRetornoSala),
          useValue: mockRetornoRepo,
        },
        {
          provide: getRepositoryToken(IndicadorConfiabilidadRAMS),
          useValue: mockIndicadorRepo,
        },
        {
          provide: getRepositoryToken(Computadora),
          useValue: mockComputadoraRepo,
        },
        {
          provide: getRepositoryToken(AveriaEquipo),
          useValue: mockAveriaRepo,
        },
        {
          provide: getRepositoryToken(Usuario),
          useValue: mockUsuarioRepo,
        },
        {
          provide: AuditoriaService,
          useValue: mockAuditoriaService,
        },
        {
          provide: MetricasRamsService,
          useValue: mockMetricasRamsService,
        },
        {
          provide: OcupacionGateway,
          useValue: mockOcupacionGateway,
        },
      ],
    }).compile();

    service = module.get<SoporteService>(SoporteService);
  });

  it('debe estar definido el servicio de soporte técnico', () => {
    expect(service).toBeDefined();
  });

  // -----------------------------------------------------------------
  // CU24: CREAR ORDEN DE TALLER
  // -----------------------------------------------------------------
  describe('crearOrdenTaller', () => {
    it('debe crear orden técnica exitosamente, inhabilitar la PC a EN_MANTENIMIENTO y registrar auditoría', async () => {
      mockComputadoraRepo.findOne.mockResolvedValue({
        id_computadora: 5,
        id_sala: 1,
        estado_actual: 'DISPONIBLE',
      });

      mockMantenimientoRepo.findOne.mockResolvedValue({
        id_mantenimiento: 1,
        id_computadora: 5,
        estado: EstadoMantenimiento.PENDIENTE_TALLER,
      });

      const res = await service.crearOrdenTaller(
        {
          id_computadora: 5,
          tipo_mantenimiento: TipoMantenimiento.CORRECTIVO,
          prioridad: PrioridadMantenimiento.ALTA,
          descripcion_problema: 'Fuente de poder en cortocircuito',
        },
        1,
        '192.168.1.50',
      );

      expect(mockComputadoraRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ estado_actual: 'EN_MANTENIMIENTO' }),
      );
      expect(mockMantenimientoRepo.save).toHaveBeenCalled();
      expect(mockAuditoriaService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'CREAR_ORDEN_TALLER',
          tabla_afectada: 'mantenimiento_taller',
        }),
      );
      expect(res).toBeDefined();
      expect(res.id_mantenimiento).toBe(1);
    });

    it('debe vincular la avería técnica originaria y actualizar su estado a EN_TALLER', async () => {
      mockComputadoraRepo.findOne.mockResolvedValue({
        id_computadora: 5,
        id_sala: 1,
        estado_actual: 'DISPONIBLE',
      });

      mockAveriaRepo.findOne.mockResolvedValue({
        id_averia: 12,
        id_computadora: 5,
        estado: EstadoAveria.PENDIENTE_REVISION,
      });

      mockMantenimientoRepo.findOne.mockResolvedValue({
        id_mantenimiento: 1,
        id_computadora: 5,
        id_averia: 12,
        estado: EstadoMantenimiento.PENDIENTE_TALLER,
      });

      await service.crearOrdenTaller(
        {
          id_computadora: 5,
          id_averia: 12,
          descripcion_problema: 'Fallo de RAM',
        },
        1,
      );

      expect(mockAveriaRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ estado: EstadoAveria.EN_TALLER }),
      );
    });

    it('debe lanzar NotFoundException si la computadora no existe', async () => {
      mockComputadoraRepo.findOne.mockResolvedValue(null);

      await expect(
        service.crearOrdenTaller(
          {
            id_computadora: 999,
            descripcion_problema: 'No existe',
          },
          1,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -----------------------------------------------------------------
  // CU24: LISTADO CON FILTROS Y PAGINACIÓN DUAL
  // -----------------------------------------------------------------
  describe('getOrdenesTaller', () => {
    it('debe retornar estructura { total, pagina, limite, items, data } soportando page y limit', async () => {
      const res = await service.getOrdenesTaller({
        page: 2,
        limit: 10,
        id_sala: 1,
      });

      expect(res).toHaveProperty('total', 1);
      expect(res).toHaveProperty('pagina', 2);
      expect(res).toHaveProperty('limite', 10);
      expect(res).toHaveProperty('items');
      expect(res).toHaveProperty('data');
      expect(Array.isArray(res.items)).toBe(true);
    });

    it('debe soportar parámetros en español pagina y limite', async () => {
      const res = await service.getOrdenesTaller({
        pagina: 3,
        limite: 20,
        busqueda: 'PC-01',
      });

      expect(res.pagina).toBe(3);
      expect(res.limite).toBe(20);
    });

    it('debe filtrar por id_usuario_tecnico si el usuario tiene rol TECNICO y no ADMINISTRADOR', async () => {
      await service.getOrdenesTaller({}, 8, ['TECNICO']);

      expect(mockMantenimientoQb.andWhere).toHaveBeenCalledWith(
        'm.id_usuario_tecnico = :idTecnico',
        { idTecnico: 8 },
      );
    });

    it('no debe filtrar por id_usuario_tecnico si el usuario es ADMINISTRADOR', async () => {
      mockMantenimientoQb.andWhere.mockClear();
      await service.getOrdenesTaller({}, 8, ['TECNICO', 'ADMINISTRADOR']);

      expect(mockMantenimientoQb.andWhere).not.toHaveBeenCalledWith(
        'm.id_usuario_tecnico = :idTecnico',
        expect.anything(),
      );
    });
  });

  // -----------------------------------------------------------------
  // CU24: INICIAR REPARACIÓN EN BANCO DE TRABAJO
  // -----------------------------------------------------------------
  describe('iniciarReparacion', () => {
    it('debe cambiar estado a EN_REPARACION y registrar diagnóstico y técnico', async () => {
      const ordenExistente = {
        id_mantenimiento: 1,
        id_computadora: 5,
        estado: EstadoMantenimiento.PENDIENTE_TALLER,
        diagnostico_tecnico: null,
      };

      mockMantenimientoRepo.findOne.mockResolvedValue(ordenExistente);

      const res = await service.iniciarReparacion(
        1,
        {
          diagnostico_tecnico: 'Falla en regulador de voltaje en placa madre',
          id_usuario_tecnico: 3,
        },
        3,
      );

      expect(mockMantenimientoRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          estado: EstadoMantenimiento.EN_REPARACION,
          id_usuario_tecnico: 3,
          diagnostico_tecnico: 'Falla en regulador de voltaje en placa madre',
        }),
      );
      expect(mockAuditoriaService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'INICIAR_MANTENIMIENTO' }),
      );
      expect(res).toBeDefined();
    });

    it('debe rechazar si la orden ya fue concluida previamente', async () => {
      mockMantenimientoRepo.findOne.mockResolvedValue({
        id_mantenimiento: 1,
        estado: EstadoMantenimiento.RETORNADO_A_SALA,
      });

      await expect(
        service.iniciarReparacion(1, { diagnostico_tecnico: 'Test' }, 1),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // -----------------------------------------------------------------
  // CU24: FINALIZAR REPARACIÓN
  // -----------------------------------------------------------------
  describe('finalizarReparacion', () => {
    it('debe conmutar estado a REPARADO_EN_TALLER, calcular horas de duración MTTR y registrar solución', async () => {
      const fechaInicio = new Date(Date.now() - 3 * 3600 * 1000); // Hace 3 horas
      const ordenEnReparacion = {
        id_mantenimiento: 1,
        id_computadora: 5,
        estado: EstadoMantenimiento.EN_REPARACION,
        fecha_hora_ingreso: fechaInicio,
        fecha_hora_inicio_taller: fechaInicio,
      };

      mockMantenimientoRepo.findOne.mockResolvedValue(ordenEnReparacion);

      const res = await service.finalizarReparacion(
        1,
        {
          solucion_aplicada: 'Sustitución de transistor MOSFET y limpieza',
          repuestos_utilizados: 'MOSFET N-Channel 30V',
          costo_reparacion: 45.0,
        },
        1,
      );

      expect(mockMantenimientoRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          estado: EstadoMantenimiento.REPARADO_EN_TALLER,
          solucion_aplicada: 'Sustitución de transistor MOSFET y limpieza',
          repuestos_utilizados: 'MOSFET N-Channel 30V',
          costo_reparacion: 45.0,
        }),
      );
      expect(mockAuditoriaService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'FINALIZAR_MANTENIMIENTO' }),
      );
      expect(res).toBeDefined();
    });
  });

  // -----------------------------------------------------------------
  // CU25: CONFIRMAR RETORNO A SALA
  // -----------------------------------------------------------------
  describe('confirmarRetornoSala', () => {
    it('debe registrar retorno, poner PC en DISPONIBLE, avería en REPARADO, recalcular RAMS y emitir WebSocket', async () => {
      const ordenReparada = {
        id_mantenimiento: 1,
        id_computadora: 5,
        id_averia: 12,
        estado: EstadoMantenimiento.REPARADO_EN_TALLER,
        solucion_aplicada: 'Reparación de módulo de alimentación',
      };

      mockMantenimientoRepo.findOne.mockResolvedValue(ordenReparada);
      mockRetornoRepo.findOne.mockResolvedValue(null);

      mockComputadoraRepo.findOne.mockResolvedValue({
        id_computadora: 5,
        id_sala: 2,
        estado_actual: 'EN_MANTENIMIENTO',
      });

      mockAveriaRepo.findOne.mockResolvedValue({
        id_averia: 12,
        estado: EstadoAveria.EN_TALLER,
      });

      const res = await service.confirmarRetornoSala(
        1,
        {
          pruebas_satisfactorias: true,
          obs_instalacion: 'Conexión a red y arranque validados',
        },
        1,
      );

      expect(mockMantenimientoRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          estado: EstadoMantenimiento.RETORNADO_A_SALA,
        }),
      );
      expect(mockRetornoRepo.save).toHaveBeenCalled();
      expect(mockComputadoraRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ estado_actual: 'DISPONIBLE' }),
      );
      expect(mockAveriaRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ estado: EstadoAveria.REPARADO }),
      );
      expect(
        mockMetricasRamsService.calcularMetricasComputadora,
      ).toHaveBeenCalledWith(5);
      expect(mockOcupacionGateway.emitirActualizacionSala).toHaveBeenCalledWith(
        2,
        expect.objectContaining({
          id_computadora: 5,
          estado_actual: 'DISPONIBLE',
        }),
      );
      expect(mockAuditoriaService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'CONFIRMAR_RETORNO_SALA' }),
      );
      expect(res).toHaveProperty('confirmacion');
      expect(res).toHaveProperty('mantenimiento');
    });

    it('debe rechazar si la orden ya fue retornada previamente', async () => {
      mockMantenimientoRepo.findOne.mockResolvedValue({
        id_mantenimiento: 1,
        estado: EstadoMantenimiento.RETORNADO_A_SALA,
      });

      await expect(
        service.confirmarRetornoSala(1, { pruebas_satisfactorias: true }, 1),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // -----------------------------------------------------------------
  // CU24 (Excepción): DECLARAR BAJA DEFINITIVA
  // -----------------------------------------------------------------
  describe('darDeBaja', () => {
    it('debe conmutar estado a BAJA_DEFINITIVA, PC a DE_BAJA y descartar la avería', async () => {
      const orden = {
        id_mantenimiento: 1,
        id_computadora: 5,
        id_averia: 12,
        estado: EstadoMantenimiento.EN_REPARACION,
      };

      mockMantenimientoRepo.findOne.mockResolvedValue(orden);

      mockComputadoraRepo.findOne.mockResolvedValue({
        id_computadora: 5,
        estado_actual: 'EN_MANTENIMIENTO',
        activo: true,
      });

      mockAveriaRepo.findOne.mockResolvedValue({
        id_averia: 12,
        estado: EstadoAveria.EN_TALLER,
      });

      const res = await service.darDeBaja(
        1,
        'Tarjeta madre fisurada con pistas quemadas irreparables',
        1,
      );

      expect(mockMantenimientoRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          estado: EstadoMantenimiento.BAJA_DEFINITIVA,
          motivo_baja:
            'Tarjeta madre fisurada con pistas quemadas irreparables',
        }),
      );
      expect(mockComputadoraRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          estado_actual: 'DE_BAJA',
          activo: false,
        }),
      );
      expect(mockAveriaRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          estado: EstadoAveria.DESCARTADO,
        }),
      );
      expect(mockAuditoriaService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'DAR_DE_BAJA_EQUIPO' }),
      );
      expect(res).toBeDefined();
    });
  });

  // -----------------------------------------------------------------
  // MÉTRICAS Y TABLERO RAMS
  // -----------------------------------------------------------------
  describe('getMetricasRamsDashboard & recalcularRams', () => {
    it('debe invocar a MetricasRamsService para obtener el tablero', async () => {
      const dash = await service.getMetricasRamsDashboard({ id_sala: 1 });
      expect(mockMetricasRamsService.getDashboardRAMS).toHaveBeenCalledWith({
        id_sala: 1,
      });
      expect(dash).toHaveProperty('kpis');
    });

    it('debe invocar calcularMetricasComputadora si se proporciona idComputadora', async () => {
      await service.recalcularRams(5, undefined, 10, 2026);
      expect(
        mockMetricasRamsService.calcularMetricasComputadora,
      ).toHaveBeenCalledWith(5, 10, 2026);
    });

    it('debe invocar calcularMetricasSala si se proporciona idSala', async () => {
      await service.recalcularRams(undefined, 2, 10, 2026);
      expect(mockMetricasRamsService.calcularMetricasSala).toHaveBeenCalledWith(
        2,
        10,
        2026,
      );
    });
  });

  // -----------------------------------------------------------------
  // CU24: LISTADO DE TÉCNICOS ACTIVOS
  // -----------------------------------------------------------------
  describe('getTecnicos', () => {
    it('debe consultar técnicos activos con el rol TECNICO ordenados por nombre', async () => {
      const res = await service.getTecnicos();

      expect(mockUsuarioRepo.createQueryBuilder).toHaveBeenCalledWith('u');
      expect(mockUsuarioQb.innerJoin).toHaveBeenCalledWith('u.roles', 'r');
      expect(mockUsuarioQb.where).toHaveBeenCalledWith('r.nombre = :rol', {
        rol: 'TECNICO',
      });
      expect(mockUsuarioQb.andWhere).toHaveBeenCalledWith('u.activo = :activo', {
        activo: true,
      });
      expect(mockUsuarioQb.orderBy).toHaveBeenCalledWith('u.nombres', 'ASC');
      expect(res).toHaveLength(1);
      expect(res[0].nombres).toBe('CARLOS');
      expect((res[0] as any).password_hash).toBeUndefined();
    });
  });
});

