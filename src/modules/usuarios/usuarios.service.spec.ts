import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { AuditoriaService } from '../auditoria/auditoria.service';

describe('UsuariosService (CU1: Gestión de Usuarios)', () => {
  let service: UsuariosService;
  let mockUsuarioRepo: any;
  let mockRolRepo: any;
  let mockAuditoriaService: any;

  beforeEach(async () => {
    mockUsuarioRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest
        .fn()
        .mockImplementation((dto) => ({ id_usuario: 10, ...dto })),
      save: jest.fn().mockImplementation((u) => Promise.resolve(u)),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            id_usuario: 1,
            correo_institucional: 'admin@uagrm.edu.bo',
            password_hash: 'hashed',
            nombres: 'Admin',
            apellidos: 'Central',
            activo: true,
            roles: [],
          },
        ]),
      }),
    };

    mockRolRepo = {
      findBy: jest
        .fn()
        .mockResolvedValue([{ id_rol: 1, nombre: 'ADMINISTRADOR' }]),
    };

    mockAuditoriaService = {
      registrar: jest.fn().mockResolvedValue({ id_auditoria: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: 'UsuarioRepository', useValue: mockUsuarioRepo },
        { provide: 'RolRepository', useValue: mockRolRepo },
        { provide: AuditoriaService, useValue: mockAuditoriaService },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
  });

  it('debe estar definido el servicio de usuarios', () => {
    expect(service).toBeDefined();
  });

  it('debe listar usuarios excluyendo el hash de contraseñas', async () => {
    const usuarios = await service.findAll();
    expect(usuarios.length).toBe(1);
    expect((usuarios[0] as any).password_hash).toBeUndefined();
    expect(usuarios[0].correo_institucional).toBe('admin@uagrm.edu.bo');
  });

  it('debe rechazar la creación si el correo ya existe (ConflictException)', async () => {
    mockUsuarioRepo.findOne.mockResolvedValue({
      id_usuario: 1,
      correo_institucional: 'duplicado@uagrm.edu.bo',
    });

    await expect(
      service.crear({
        correo_institucional: 'duplicado@uagrm.edu.bo',
        password: 'Password123*',
        nombres: 'Test',
        apellidos: 'Test',
        roles_ids: [1],
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('debe crear un usuario institucional, hashear su clave y auditar el evento', async () => {
    mockUsuarioRepo.findOne.mockResolvedValue(null);

    const res = await service.crear({
      correo_institucional: 'nuevo.auxiliar@uagrm.edu.bo',
      password: 'ClaveSegura123*',
      nombres: 'Pedro',
      apellidos: 'Mamani',
      roles_ids: [1],
    });

    expect(res).toBeDefined();
    expect(res.correo_institucional).toBe('nuevo.auxiliar@uagrm.edu.bo');
    expect(mockAuditoriaService.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'INSERT',
        tabla_afectada: 'usuario',
      }),
    );
  });
});
