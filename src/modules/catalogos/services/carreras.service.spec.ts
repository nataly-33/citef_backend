import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CarrerasService } from './carreras.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';

describe('CarrerasService (CU5: Gestión de Carreras)', () => {
  let service: CarrerasService;
  let mockCarreraRepo: any;
  let mockAuditoriaService: any;

  beforeEach(async () => {
    mockCarreraRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest
        .fn()
        .mockImplementation((dto) => ({ id_carrera: 1, ...dto })),
      save: jest.fn().mockImplementation((c) => Promise.resolve(c)),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [
            {
              id_carrera: 1,
              codigo: '186-5',
              nombre: 'Ingeniería Comercial',
              activo: true,
            },
          ],
          1,
        ]),
        getMany: jest.fn().mockResolvedValue([
          {
            id_carrera: 1,
            codigo: '186-5',
            nombre: 'Ingeniería Comercial',
            activo: true,
          },
        ]),
      }),
    };

    mockAuditoriaService = {
      registrar: jest.fn().mockResolvedValue({ id_auditoria: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CarrerasService,
        { provide: 'CarreraRepository', useValue: mockCarreraRepo },
        { provide: AuditoriaService, useValue: mockAuditoriaService },
      ],
    }).compile();

    service = module.get<CarrerasService>(CarrerasService);
  });

  it('debe estar definido el servicio de carreras', () => {
    expect(service).toBeDefined();
  });

  it('debe listar carreras con paginación estándar de 15 filas', async () => {
    const res = await service.findAll();
    expect(res).toHaveProperty('total', 1);
    expect(res).toHaveProperty('pagina', 1);
    expect(res).toHaveProperty('limite', 15);
    expect(res).toHaveProperty('paginas_totales', 1);
    expect(res.items).toHaveLength(1);
  });

  it('debe crear una nueva carrera y registrar en auditoría', async () => {
    mockCarreraRepo.findOne.mockResolvedValue(null);

    const dto = {
      codigo: '186-5',
      nombre: 'Ingeniería Comercial',
      activo: true,
    };
    const res = await service.crear(
      dto,
      { id_usuario: 1, correo: 'admin@uagrm.edu.bo' },
      '127.0.0.1',
    );

    expect(res.codigo).toBe('186-5');
    expect(mockCarreraRepo.save).toHaveBeenCalled();
    expect(mockAuditoriaService.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'INSERT',
        tabla_afectada: 'carrera',
      }),
    );
  });

  it('debe rechazar la creación si el código ya existe (ConflictException)', async () => {
    mockCarreraRepo.findOne.mockResolvedValue({
      id_carrera: 1,
      codigo: '186-5',
    });

    const dto = {
      codigo: '186-5',
      nombre: 'Ingeniería Comercial',
      activo: true,
    };
    await expect(service.crear(dto)).rejects.toThrow(ConflictException);
  });

  it('debe lanzar NotFoundException si la carrera no existe', async () => {
    mockCarreraRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
  });
});
