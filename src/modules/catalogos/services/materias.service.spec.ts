import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { MateriasService } from './materias.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';

describe('MateriasService (CU5: Gestión de Materias)', () => {
  let service: MateriasService;
  let mockMateriaRepo: any;
  let mockCarreraRepo: any;
  let mockAuditoriaService: any;

  beforeEach(async () => {
    mockMateriaRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ id_materia: 10, ...dto })),
      save: jest.fn().mockImplementation((m) => Promise.resolve(m)),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [
            {
              id_materia: 10,
              sigla: 'MAT101',
              nombre: 'Cálculo I',
              semestre_nivel: 1,
              id_carrera: 1,
              activo: true,
            },
          ],
          1,
        ]),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

    mockCarreraRepo = {
      findOne: jest.fn().mockResolvedValue({
        id_carrera: 1,
        codigo: '186-5',
        nombre: 'Ingeniería Comercial',
      }),
    };

    mockAuditoriaService = {
      registrar: jest.fn().mockResolvedValue({ id_auditoria: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MateriasService,
        { provide: 'MateriaRepository', useValue: mockMateriaRepo },
        { provide: 'CarreraRepository', useValue: mockCarreraRepo },
        { provide: AuditoriaService, useValue: mockAuditoriaService },
      ],
    }).compile();

    service = module.get<MateriasService>(MateriasService);
  });

  it('debe estar definido el servicio de materias', () => {
    expect(service).toBeDefined();
  });

  it('debe crear materia validando unicidad [sigla, id_carrera]', async () => {
    mockMateriaRepo.findOne
      .mockResolvedValueOnce(null) // para chequeo de duplicados
      .mockResolvedValueOnce({
        id_materia: 10,
        sigla: 'MAT101',
        nombre: 'Cálculo I',
        semestre_nivel: 1,
        id_carrera: 1,
      });

    const dto = {
      sigla: 'MAT101',
      nombre: 'Cálculo I',
      semestre_nivel: 1,
      id_carrera: 1,
    };

    const res = await service.crear(dto, { id_usuario: 1, correo: 'admin@uagrm.edu.bo' }, '127.0.0.1');
    expect(res.sigla).toBe('MAT101');
    expect(mockAuditoriaService.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'INSERT', tabla_afectada: 'materia' }),
    );
  });

  it('debe rechazar si la sigla ya existe en la misma carrera', async () => {
    mockMateriaRepo.findOne.mockResolvedValue({
      id_materia: 5,
      sigla: 'MAT101',
      id_carrera: 1,
    });

    const dto = {
      sigla: 'MAT101',
      nombre: 'Cálculo I',
      semestre_nivel: 1,
      id_carrera: 1,
    };

    await expect(service.crear(dto)).rejects.toThrow(ConflictException);
  });

  it('debe fallar si la carrera especificada no existe', async () => {
    mockCarreraRepo.findOne.mockResolvedValue(null);

    const dto = {
      sigla: 'MAT101',
      nombre: 'Cálculo I',
      semestre_nivel: 1,
      id_carrera: 999,
    };

    await expect(service.crear(dto)).rejects.toThrow(NotFoundException);
  });
});
