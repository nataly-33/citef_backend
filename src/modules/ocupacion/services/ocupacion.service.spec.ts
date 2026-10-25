import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { OcupacionService } from './ocupacion.service';
import { OcupacionGateway } from '../gateways/ocupacion.gateway';
import { ReservasGateway } from '../../reservas/gateways/reservas.gateway';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { ColasEsperaService } from './colas-espera.service';
import { DataSource } from 'typeorm';

describe('OcupacionService (CU12, CU13, CU14: Ocupación en Tiempo Real)', () => {
  let service: OcupacionService;
  let mockSalaRepo: any;
  let mockComputadoraRepo: any;
  let mockEstudianteRepo: any;
  let mockSesionRepo: any;
  let mockColaRepo: any;
  let mockMotivoRepo: any;
  let mockGateway: any;
  let mockAuditoriaService: any;
  let mockColasEsperaService: any;
  let mockDataSource: any;

  beforeEach(async () => {
    mockSalaRepo = {
      findOne: jest.fn(),
    };

    mockComputadoraRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn().mockImplementation((c) => Promise.resolve(c)),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id_computadora: 10,
          codigo_equipo: 'L1-PC10',
          estado_actual: 'DISPONIBLE',
          horas_uso_acumuladas: 5.5,
        }),
      }),
    };

    mockEstudianteRepo = {
      findOne: jest.fn(),
    };

    mockSesionRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      save: jest
        .fn()
        .mockImplementation((s) => Promise.resolve({ id_asignacion: 1, ...s })),
    };

    mockColaRepo = {
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    };

    mockMotivoRepo = {
      findOne: jest.fn(),
    };

    mockGateway = {
      emitirActualizacionSala: jest.fn(),
    };

    mockAuditoriaService = {
      registrar: jest.fn().mockResolvedValue({ id_auditoria: 1 }),
    };

    mockColasEsperaService = {
      calcularTiempoEsperaEstimado: jest.fn().mockReturnValue(5.0),
    };

    mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue({
        connect: jest.fn().mockResolvedValue(undefined),
        startTransaction: jest.fn().mockResolvedValue(undefined),
        commitTransaction: jest.fn().mockResolvedValue(undefined),
        rollbackTransaction: jest.fn().mockResolvedValue(undefined),
        release: jest.fn().mockResolvedValue(undefined),
        manager: {
          findOne: jest.fn().mockResolvedValue({
            id_computadora: 10,
            codigo_equipo: 'L1-PC10',
            estado_actual: 'DISPONIBLE',
          }),
          save: jest
            .fn()
            .mockImplementation((entity) => Promise.resolve(entity)),
          create: jest
            .fn()
            .mockImplementation((_, data) => ({ id_asignacion: 100, ...data })),
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OcupacionService,
        { provide: 'LaboratorioSalaRepository', useValue: mockSalaRepo },
        { provide: 'ComputadoraRepository', useValue: mockComputadoraRepo },
        { provide: 'EstudianteRepository', useValue: mockEstudianteRepo },
        { provide: 'AsignacionSesionRepository', useValue: mockSesionRepo },
        { provide: 'ColaEsperaSalaRepository', useValue: mockColaRepo },
        { provide: 'MotivoUsoRepository', useValue: mockMotivoRepo },
        {
          provide: 'ReservaSalaRepository',
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
        { provide: OcupacionGateway, useValue: mockGateway },
        { provide: AuditoriaService, useValue: mockAuditoriaService },
        { provide: ColasEsperaService, useValue: mockColasEsperaService },
        {
          provide: ReservasGateway,
          useValue: {
            emitirActualizacionReservas: jest.fn(),
            emitirActualizacion: jest.fn(),
          },
        },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<OcupacionService>(OcupacionService);
  });

  it('debe estar definido el servicio de ocupación', () => {
    expect(service).toBeDefined();
  });

  describe('obtenerEstadoSala (CU12: Monitoreo)', () => {
    it('debe arrojar NotFoundException si la sala no existe', async () => {
      mockSalaRepo.findOne.mockResolvedValue(null);
      await expect(service.obtenerEstadoSala(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe retornar KPIs y topología si la sala existe', async () => {
      mockSalaRepo.findOne.mockResolvedValue({
        id_sala: 1,
        codigo_sala: 'LAB-01',
        nombre: 'Laboratorio de Finanzas',
        filas_cuadricula: 6,
        columnas_cuadricula: 8,
      });

      mockComputadoraRepo.find.mockResolvedValue([
        {
          id_computadora: 1,
          codigo_equipo: 'L1-PC01',
          estado_actual: 'DISPONIBLE',
          maquina_docente: false,
          horas_uso_acumuladas: 10,
          perifericos: [],
        },
        {
          id_computadora: 2,
          codigo_equipo: 'L1-PC02',
          estado_actual: 'OCUPADA',
          maquina_docente: false,
          horas_uso_acumuladas: 20,
          perifericos: [],
        },
      ]);

      const res = await service.obtenerEstadoSala(1);
      expect(res).toBeDefined();
      expect(res.sala.codigo_sala).toBe('LAB-01');
      expect(res.kpis.total_puestos).toBe(2);
      expect(res.kpis.disponibles).toBe(1);
      expect(res.kpis.ocupadas).toBe(1);
      expect(res.kpis.porcentaje_ocupacion).toBe(50);
    });
  });

  describe('asignarEquipo (CU13: Asignar Equipo)', () => {
    it('debe arrojar NotFoundException si el estudiante no existe', async () => {
      mockEstudianteRepo.findOne.mockResolvedValue(null);
      await expect(
        service.asignarEquipo(
          {
            id_sala: 1,
            registro_estudiante: '999999999',
            id_motivo: 1,
          },
          1,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe rechazar asignación si el estudiante está sancionado', async () => {
      mockEstudianteRepo.findOne.mockResolvedValue({
        registro: '220011509',
        sancionado: true,
        motivo_sancion: 'Investigación técnica pendiente',
      });

      await expect(
        service.asignarEquipo(
          {
            id_sala: 1,
            registro_estudiante: '220011509',
            id_motivo: 1,
          },
          1,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar asignación si el estudiante ya cuenta con sesión activa en CITEF', async () => {
      mockEstudianteRepo.findOne.mockResolvedValue({
        registro: '220011501',
        sancionado: false,
      });

      mockSesionRepo.findOne.mockResolvedValue({
        id_asignacion: 5,
        estado: 'EN_CURSO',
        computadora: {
          codigo_equipo: 'L2-PC04',
          sala: { codigo_sala: 'LAB-02' },
        },
      });

      await expect(
        service.asignarEquipo(
          {
            id_sala: 1,
            registro_estudiante: '220011501',
            id_motivo: 1,
          },
          1,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('liberarEquipo (CU14: Checkout y Liberación)', () => {
    it('debe arrojar NotFoundException si la computadora no existe', async () => {
      mockComputadoraRepo.findOne.mockResolvedValue(null);
      await expect(
        service.liberarEquipo({ id_computadora: 999 }, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe liberar la computadora y calcular minutos de permanencia', async () => {
      const pc = {
        id_computadora: 1,
        codigo_equipo: 'L1-PC01',
        estado_actual: 'OCUPADA',
        horas_uso_acumuladas: 10.0,
        id_sala: 1,
      };
      mockComputadoraRepo.findOne.mockResolvedValue(pc);

      const sesion = {
        id_asignacion: 1,
        fecha_hora_inicio: new Date(Date.now() - 45 * 60000), // Hace 45 min
        estado: 'EN_CURSO',
        estudiante: {
          registro: '220011501',
          nombres: 'Carlos',
          apellidos: 'Vargas',
        },
      };
      mockSesionRepo.findOne.mockResolvedValue(sesion);

      const res = await service.liberarEquipo({ id_computadora: 1 }, 1);
      expect(res).toBeDefined();
      expect(res.minutos_uso).toBe(45);
      expect(mockAuditoriaService.registrar).toHaveBeenCalled();
    });
  });
});
