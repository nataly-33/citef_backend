import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { TokenRecuperacion } from '../usuarios/entities/token-recuperacion.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import * as bcrypt from 'bcryptjs';

describe('AuthService (Módulo 1: Seguridad)', () => {
  let service: AuthService;
  let mockUsuarioRepo: any;
  let mockTokenRepo: any;
  let mockJwtService: any;
  let mockAuditoriaService: any;

  beforeEach(async () => {
    mockUsuarioRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
    };
    mockTokenRepo = {
      create: jest.fn().mockImplementation((dto) => ({ id_token: 1, ...dto })),
      save: jest.fn().mockImplementation((t) => Promise.resolve(t)),
      findOne: jest.fn(),
    };
    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock_jwt_token_12345'),
    };
    mockAuditoriaService = {
      registrar: jest.fn().mockResolvedValue({ id_auditoria: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: 'UsuarioRepository', useValue: mockUsuarioRepo },
        { provide: 'TokenRecuperacionRepository', useValue: mockTokenRepo },
        { provide: JwtService, useValue: mockJwtService },
        { provide: AuditoriaService, useValue: mockAuditoriaService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('debe estar definido el servicio de autenticación', () => {
    expect(service).toBeDefined();
  });

  describe('CU1/Login: Inicio de Sesión Institucional', () => {
    it('debe iniciar sesión exitosamente con credenciales válidas y registrar auditoría', async () => {
      const passwordPlain = 'Admin123*';
      const passwordHash = await bcrypt.hash(passwordPlain, 10);

      mockUsuarioRepo.findOne.mockResolvedValue({
        id_usuario: 1,
        correo_institucional: 'admin@uagrm.edu.bo',
        password_hash: passwordHash,
        nombres: 'Admin',
        apellidos: 'Central',
        activo: true,
        roles: [{ nombre: 'ADMINISTRADOR', permisos: [{ codigo: 'SEG_USUARIOS_VER' }] }],
      });

      const resultado = await service.login(
        { correo: 'admin@uagrm.edu.bo', password: passwordPlain },
        '127.0.0.1',
      );

      expect(resultado).toBeDefined();
      expect(resultado.access_token).toBe('mock_jwt_token_12345');
      expect(resultado.usuario.correo_institucional).toBe('admin@uagrm.edu.bo');
      expect(resultado.usuario.roles).toContain('ADMINISTRADOR');
      expect(mockAuditoriaService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'LOGIN',
          tabla_afectada: 'usuario',
        }),
      );
    });

    it('debe lanzar UnauthorizedException si la contraseña no coincide', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue({
        id_usuario: 1,
        correo_institucional: 'admin@uagrm.edu.bo',
        password_hash: await bcrypt.hash('Correcta123*', 10),
        activo: true,
      });

      await expect(
        service.login({ correo: 'admin@uagrm.edu.bo', password: 'PasswordErronea' }),
      ).rejects.toThrow('Credenciales inválidas');
    });
  });

  describe('CU2: Autoservicio de Recuperación de Contraseña (15 min)', () => {
    it('debe generar token criptográfico y registrar auditoría al solicitar recuperación', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue({
        id_usuario: 1,
        correo_institucional: 'admin@uagrm.edu.bo',
      });

      const respuesta = await service.solicitarRecuperacion(
        { correo: 'admin@uagrm.edu.bo' },
        '127.0.0.1',
      );

      expect(respuesta).toBeDefined();
      expect(respuesta.token).toBeDefined();
      expect(respuesta.token.length).toBe(64); // 32 bytes hex
      expect(mockTokenRepo.save).toHaveBeenCalled();
      expect(mockAuditoriaService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'SOLICITUD_RECUPERACION_PASSWORD',
        }),
      );
    });
  });
});
