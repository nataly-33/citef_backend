import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PerifericosService } from './perifericos.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';

describe('PerifericosService (CU11: Control de Inventario de Periféricos)', () => {
  let service: PerifericosService;
  let mockPerifericoRepo: any;
  let mockTipoRepo: any;
  let mockComputadoraRepo: any;
  let mockAuditoriaService: any;

  beforeEach(async () => {
    mockPerifericoRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ id_periferico: 1, ...dto })),
      save: jest.fn().mockImplementation((p) => Promise.resolve(p)),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        getMany: jest.fn().mockResolvedValue([
          {
            id_periferico: 1,
            marca_modelo: 'Logitech K120',
            numero_serie: 'SN-001',
            condicion_fisica: 'BUENO',
            tipo: { id_tipo_periferico: 1, nombre: 'TECLADO' },
            computadora: null,
          },
        ]),
      }),
    };

    mockTipoRepo = {
      find: jest.fn().mockResolvedValue([{ id_tipo_periferico: 1, nombre: 'TECLADO' }]),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((t) => ({ id_tipo_periferico: 1, ...t })),
      save: jest.fn().mockImplementation((t) => Promise.resolve(t)),
    };

    mockComputadoraRepo = {
      findOne: jest.fn(),
    };

    mockAuditoriaService = {
      registrar: jest.fn().mockResolvedValue({ id_auditoria: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerifericosService,
        { provide: 'PerifericoInventarioRepository', useValue: mockPerifericoRepo },
        { provide: 'TipoPerifericoRepository', useValue: mockTipoRepo },
        { provide: 'ComputadoraRepository', useValue: mockComputadoraRepo },
        { provide: AuditoriaService, useValue: mockAuditoriaService },
      ],
    }).compile();

    service = module.get<PerifericosService>(PerifericosService);
  });

  it('debe estar definido el servicio de periféricos', () => {
    expect(service).toBeDefined();
  });

  it('debe listar periféricos con paginación de 15 filas', async () => {
    const res = await service.findAll();
    expect(res).toHaveProperty('total', 1);
    expect(res).toHaveProperty('limite', 15);
    expect(res.data).toHaveLength(1);
  });

  it('debe rechazar registro con número de serie duplicado', async () => {
    mockTipoRepo.findOne.mockResolvedValue({ id_tipo_periferico: 1, nombre: 'TECLADO' });
    mockPerifericoRepo.findOne.mockResolvedValue({ id_periferico: 9, numero_serie: 'SN-001' });

    await expect(
      service.registrar({
        id_tipo_periferico: 1,
        marca_modelo: 'Logitech K120',
        numero_serie: 'SN-001',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('debe reasignar periférico a bodega o a computadora', async () => {
    mockPerifericoRepo.findOne
      .mockResolvedValueOnce({ id_periferico: 1, id_computadora: 5 })
      .mockResolvedValueOnce({ id_periferico: 1, id_computadora: null, tipo: {}, computadora: null });

    const res = await service.asignar(1, { id_computadora: null });
    expect(mockAuditoriaService.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'ASIGNAR',
        tabla_afectada: 'periferico_inventario',
      }),
    );
  });
});
