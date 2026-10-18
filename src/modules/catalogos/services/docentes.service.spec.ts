import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { DocentesService } from './docentes.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { DataSource } from 'typeorm';

describe('DocentesService (CU7: Importación y Padrón Docente)', () => {
  let service: DocentesService;
  let mockDocenteRepo: any;
  let mockDataSource: any;
  let mockAuditoriaService: any;

  beforeEach(async () => {
    mockDocenteRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto })),
      save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
      createQueryBuilder: jest.fn().mockReturnValue({
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [
            {
              codigo: 'DOC-1001',
              nombres: 'Carlos Alberto',
              apellidos: 'Martinez Soliz',
              correo: 'carlos.martinez@uagrm.edu.bo',
              telefono: '77012345',
              activo: true,
            },
          ],
          1,
        ]),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

    mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue({
        connect: jest.fn().mockResolvedValue(undefined),
        startTransaction: jest.fn().mockResolvedValue(undefined),
        commitTransaction: jest.fn().mockResolvedValue(undefined),
        rollbackTransaction: jest.fn().mockResolvedValue(undefined),
        release: jest.fn().mockResolvedValue(undefined),
        manager: {
          findOne: jest.fn().mockImplementation((entity) => {
            if (entity.name === 'Rol') return Promise.resolve({ id_rol: 3, nombre: 'DOCENTE' });
            return Promise.resolve(null);
          }),
          create: jest.fn().mockImplementation((entity, dto) => ({ ...dto, id_usuario: 1 })),
          save: jest.fn().mockImplementation((d) => Promise.resolve({ ...d, id_usuario: d.id_usuario || 1 })),
        },
      }),
    };

    mockAuditoriaService = {
      registrar: jest.fn().mockResolvedValue({ id_auditoria: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocentesService,
        { provide: 'DocenteRepository', useValue: mockDocenteRepo },
        { provide: 'UsuarioRepository', useValue: { findOne: jest.fn() } },
        { provide: 'RolRepository', useValue: { findOne: jest.fn() } },
        { provide: DataSource, useValue: mockDataSource },
        { provide: AuditoriaService, useValue: mockAuditoriaService },
      ],
    }).compile();

    service = module.get<DocentesService>(DocentesService);
  });

  it('debe estar definido el servicio de docentes', () => {
    expect(service).toBeDefined();
  });

  it('debe obtener la estructura de la plantilla oficial en JSON', () => {
    const estructura = service.obtenerEstructuraPlantilla();
    expect(estructura.columnas_requeridas).toContain('codigo');
    expect(estructura.columnas_requeridas).toContain('nombres');
    expect(estructura.columnas_requeridas).toContain('apellidos');
    expect(estructura.columnas_requeridas).toContain('correo');
  });

  it('debe generar el buffer del archivo Excel para la plantilla', () => {
    const buffer = service.generarPlantillaExcel();
    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('debe crear un docente individual registrando auditoría', async () => {
    mockDocenteRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        codigo: 'DOC-2020',
        id_usuario: 1,
        departamento_academico: 'General',
        condicion_contrato: 'TITULAR',
        activo: true,
        usuario: {
          nombres: 'Mario',
          apellidos: 'Bunge',
          correo_institucional: 'mario.bunge@uagrm.edu.bo',
          telefono: '70011223',
        },
      });

    const dto = {
      codigo: 'DOC-2020',
      nombres: 'Mario',
      apellidos: 'Bunge',
      correo: 'mario.bunge@uagrm.edu.bo',
      telefono: '70011223',
    };

    const res = await service.crear(dto, { id_usuario: 1, correo: 'admin@uagrm.edu.bo' }, '127.0.0.1');
    expect(res.codigo).toBe('DOC-2020');
    expect(mockAuditoriaService.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'INSERT', tabla_afectada: 'docente' }),
    );
  });

  it('debe rechazar la creación individual si el código ya existe', async () => {
    mockDocenteRepo.findOne.mockResolvedValue({ codigo: 'DOC-2020' });

    const dto = {
      codigo: 'DOC-2020',
      nombres: 'Mario',
      apellidos: 'Bunge',
      correo: 'mario.bunge@uagrm.edu.bo',
    };

    await expect(service.crear(dto)).rejects.toThrow(ConflictException);
  });

  it('debe rechazar la importación si el archivo está vacío', async () => {
    await expect(
      service.importarExcel(Buffer.from([]), 'vacio.xlsx'),
    ).rejects.toThrow(BadRequestException);
  });
});
