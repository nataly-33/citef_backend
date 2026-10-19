import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { ComputadorasService } from './computadoras.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { DataSource } from 'typeorm';

describe('ComputadorasService (CU10: Configuración de Salas y Cuadrícula)', () => {
  let service: ComputadorasService;
  let mockComputadoraRepo: any;
  let mockSalaRepo: any;
  let mockPerifericoRepo: any;
  let mockAuditoriaService: any;
  let mockDataSource: any;

  beforeEach(async () => {
    mockSalaRepo = {
      findOne: jest.fn(),
    };

    mockComputadoraRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ id_computadora: 1, ...dto })),
      save: jest.fn().mockImplementation((c) => Promise.resolve(c)),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      }),
    };

    mockPerifericoRepo = {
      update: jest.fn().mockResolvedValue({ affected: 2 }),
    };

    mockAuditoriaService = {
      registrar: jest.fn().mockResolvedValue({ id_auditoria: 1 }),
    };

    const mockSesionRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation((s) => Promise.resolve(s)),
    };

    mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue({
        connect: jest.fn().mockResolvedValue(undefined),
        startTransaction: jest.fn().mockResolvedValue(undefined),
        commitTransaction: jest.fn().mockResolvedValue(undefined),
        rollbackTransaction: jest.fn().mockResolvedValue(undefined),
        release: jest.fn().mockResolvedValue(undefined),
        manager: {
          update: jest.fn().mockResolvedValue(undefined),
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComputadorasService,
        { provide: 'ComputadoraRepository', useValue: mockComputadoraRepo },
        { provide: 'LaboratorioSalaRepository', useValue: mockSalaRepo },
        { provide: 'PerifericoInventarioRepository', useValue: mockPerifericoRepo },
        { provide: 'AsignacionSesionRepository', useValue: mockSesionRepo },
        { provide: AuditoriaService, useValue: mockAuditoriaService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<ComputadorasService>(ComputadorasService);
  });

  it('debe estar definido el servicio de computadoras', () => {
    expect(service).toBeDefined();
  });

  it('debe rechazar la creación si excede la capacidad de la sala', async () => {
    mockSalaRepo.findOne.mockResolvedValue({
      id_sala: 1,
      nombre: 'Lab 1',
      cant_estudiantes: 2,
      maquina_docente: false,
      filas_cuadricula: 6,
      columnas_cuadricula: 8,
      computadoras: [{ id_computadora: 1, activo: true }, { id_computadora: 2, activo: true }],
    });

    await expect(
      service.crear({
        id_sala: 1,
        codigo_equipo: 'L1-PC03',
        posicion_fila: 2,
        posicion_columna: 2,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('debe rechazar la creación si la posición colisiona con otra máquina', async () => {
    mockSalaRepo.findOne.mockResolvedValue({
      id_sala: 1,
      nombre: 'Lab 1',
      cant_estudiantes: 24,
      maquina_docente: true,
      filas_cuadricula: 6,
      columnas_cuadricula: 8,
      computadoras: [],
    });

    mockComputadoraRepo.findOne
      .mockResolvedValueOnce(null) // no duplicate code
      .mockResolvedValueOnce({ id_computadora: 5, codigo_equipo: 'L1-PC01' }); // cell occupied

    await expect(
      service.crear({
        id_sala: 1,
        codigo_equipo: 'L1-PC02',
        posicion_fila: 2,
        posicion_columna: 3,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('debe guardar posiciones masivas exitosamente', async () => {
    mockSalaRepo.findOne.mockResolvedValue({
      id_sala: 1,
      codigo_sala: 'LAB-01',
      filas_cuadricula: 6,
      columnas_cuadricula: 8,
    });
    mockComputadoraRepo.find.mockResolvedValue([]);

    const res = await service.guardarPosicionesMasivas(1, {
      posiciones: [
        { id_computadora: 1, posicion_fila: 1, posicion_columna: 1 },
        { id_computadora: 2, posicion_fila: 1, posicion_columna: 2 },
      ],
    });

    expect(res).toBeDefined();
    expect(mockDataSource.createQueryRunner).toHaveBeenCalled();
  });

  it('debe devolver los periféricos a bodega al desactivar una computadora', async () => {
    mockComputadoraRepo.findOne.mockResolvedValue({
      id_computadora: 7,
      codigo_equipo: 'LAB1-PC07',
      activo: true,
    });

    await service.eliminar(7);

    expect(mockPerifericoRepo.update).toHaveBeenCalledWith(
      { id_computadora: 7 },
      { id_computadora: null },
    );
  });
});
