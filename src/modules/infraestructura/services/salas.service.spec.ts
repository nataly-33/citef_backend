import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SalasService } from './salas.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';

describe('SalasService (CU9: Gestión de Salas y Laboratorios)', () => {
  let service: SalasService;
  let mockSalaRepo: any;
  let mockComputadoraRepo: any;
  let mockAuditoriaService: any;

  beforeEach(async () => {
    mockSalaRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ id_sala: 1, ...dto })),
      save: jest.fn().mockImplementation((s) => Promise.resolve(s)),
      createQueryBuilder: jest.fn().mockReturnValue({
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            id_sala: 1,
            codigo_sala: 'LAB-01',
            nombre: 'Laboratorio 1',
            piso: 1,
            cant_estudiantes: 24,
            maquina_docente: true,
            proyector: true,
            aire_acondicionado: true,
            filas_cuadricula: 6,
            columnas_cuadricula: 8,
            estado_operativo: 'OPERATIVA',
            activo: true,
          },
        ]),
      }),
    };

    mockComputadoraRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            id_sala: 1,
            total: '12',
            disponibles: '10',
            ocupadas: '2',
            en_mantenimiento: '0',
          },
        ]),
      }),
    };

    mockAuditoriaService = {
      registrar: jest.fn().mockResolvedValue({ id_auditoria: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalasService,
        { provide: 'LaboratorioSalaRepository', useValue: mockSalaRepo },
        { provide: 'ComputadoraRepository', useValue: mockComputadoraRepo },
        { provide: AuditoriaService, useValue: mockAuditoriaService },
      ],
    }).compile();

    service = module.get<SalasService>(SalasService);
  });

  it('debe estar definido el servicio de salas', () => {
    expect(service).toBeDefined();
  });

  it('debe listar todas las salas calculando estadísticas de computadoras', async () => {
    const res = await service.findAll();
    expect(res).toHaveLength(1);
    expect(res[0]).toHaveProperty('total_equipos', 12);
    expect(res[0]).toHaveProperty('equipos_disponibles', 10);
  });

  it('debe crear una nueva sala exitosamente y auditar la operación', async () => {
    mockSalaRepo.findOne.mockResolvedValue(null);

    const res = await service.crear({
      codigo_sala: 'LAB-03',
      nombre: 'Laboratorio de Auditoría 3',
      piso: 3,
      cant_estudiantes: 20,
    });

    expect(res.codigo_sala).toBe('LAB-03');
    expect(mockAuditoriaService.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'CREAR',
        tabla_afectada: 'laboratorio_sala',
      }),
    );
  });

  it('debe rechazar la creación si el código de sala ya existe', async () => {
    mockSalaRepo.findOne.mockResolvedValue({ id_sala: 1, codigo_sala: 'LAB-01' });

    await expect(
      service.crear({
        codigo_sala: 'LAB-01',
        nombre: 'Duplicado',
        piso: 1,
      }),
    ).rejects.toThrow(ConflictException);
  });
});
