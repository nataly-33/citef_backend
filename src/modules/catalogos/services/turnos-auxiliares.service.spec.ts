import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { TurnosAuxiliaresService } from './turnos-auxiliares.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';

describe('TurnosAuxiliaresService (CU8: Asignación de Turnos a Auxiliares)', () => {
  let service: TurnosAuxiliaresService;
  let mockTurnoRepo: any;
  let mockUsuarioRepo: any;
  let mockHorarioRepo: any;
  let mockAuditoriaService: any;

  beforeEach(async () => {
    mockTurnoRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest
        .fn()
        .mockImplementation((dto) => ({ id_asignacion_turno: 1, ...dto })),
      save: jest.fn().mockImplementation((t) => Promise.resolve(t)),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

    mockUsuarioRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            id_usuario: 4,
            nombres: 'Jael Nataly',
            apellidos: 'Auxiliar de Laboratorio',
            correo_institucional: 'auxiliar@uagrm.edu.bo',
            activo: true,
          },
        ]),
      }),
    };

    mockHorarioRepo = {
      findOne: jest.fn().mockResolvedValue({
        id_horario: 1,
        turno: 'MAÑANA',
        hora_inicio: '07:00:00',
        hora_fin: '12:00:00',
        activo: true,
      }),
    };

    mockAuditoriaService = {
      registrar: jest.fn().mockResolvedValue({ id_auditoria: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TurnosAuxiliaresService,
        { provide: 'AsignarTurnoRepository', useValue: mockTurnoRepo },
        { provide: 'UsuarioRepository', useValue: mockUsuarioRepo },
        { provide: 'HorarioOperativoRepository', useValue: mockHorarioRepo },
        { provide: AuditoriaService, useValue: mockAuditoriaService },
      ],
    }).compile();

    service = module.get<TurnosAuxiliaresService>(TurnosAuxiliaresService);
  });

  it('debe estar definido el servicio de turnos de auxiliares', () => {
    expect(service).toBeDefined();
  });

  it('debe listar auxiliares disponibles con rol AUXILIAR', async () => {
    const res = await service.listarAuxiliaresDisponibles();
    expect(res).toHaveLength(1);
    expect(res[0].id_usuario).toBe(4);
  });

  it('debe rechazar la asignación si el usuario no tiene rol AUXILIAR (BadRequestException)', async () => {
    mockUsuarioRepo.findOne.mockResolvedValue({
      id_usuario: 3,
      nombres: 'Carlos',
      apellidos: 'Docente',
      activo: true,
      roles: [{ id_rol: 2, nombre: 'DOCENTE' }],
    });

    const dto = {
      id_usuario: 3,
      id_horario: 1,
      semestre: '1-2026',
      fecha_inicio: '2026-02-01',
      fecha_fin: '2026-07-31',
    };

    await expect(service.asignarTurno(dto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('debe asignar turno exitosamente a un usuario con rol AUXILIAR', async () => {
    mockUsuarioRepo.findOne.mockResolvedValue({
      id_usuario: 4,
      nombres: 'Jael Nataly',
      apellidos: 'Auxiliar',
      activo: true,
      roles: [{ id_rol: 3, nombre: 'AUXILIAR' }],
    });

    mockTurnoRepo.findOne.mockResolvedValue({
      id_asignacion_turno: 1,
      id_usuario: 4,
      id_horario: 1,
      semestre: '1-2026',
      usuario: { nombres: 'Jael', apellidos: 'Auxiliar' },
      horario: { turno: 'MAÑANA' },
    });

    const dto = {
      id_usuario: 4,
      id_horario: 1,
      semestre: '1-2026',
      fecha_inicio: '2026-02-01',
      fecha_fin: '2026-07-31',
    };

    const res = await service.asignarTurno(
      dto,
      { id_usuario: 1, correo: 'admin@uagrm.edu.bo' },
      '127.0.0.1',
    );
    expect(res.id_asignacion_turno).toBe(1);
    expect(mockAuditoriaService.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'INSERT',
        tabla_afectada: 'asignar_turno',
      }),
    );
  });

  it('debe prevenir superposición de turnos en el mismo semestre para el mismo auxiliar (ConflictException)', async () => {
    mockUsuarioRepo.findOne.mockResolvedValue({
      id_usuario: 4,
      nombres: 'Jael Nataly',
      apellidos: 'Auxiliar',
      activo: true,
      roles: [{ id_rol: 3, nombre: 'AUXILIAR' }],
    });

    // Simulamos que ya tiene un turno en el semestre que solapa
    mockTurnoRepo.createQueryBuilder.mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id_asignacion_turno: 99,
          id_usuario: 4,
          id_horario: 1,
          semestre: '1-2026',
          fecha_inicio: '2026-02-01',
          fecha_fin: '2026-07-31',
          horario: {
            id_horario: 1,
            turno: 'MAÑANA',
            hora_inicio: '07:00:00',
            hora_fin: '12:00:00',
          },
        },
      ]),
    });

    const dto = {
      id_usuario: 4,
      id_horario: 1,
      semestre: '1-2026',
      fecha_inicio: '2026-02-01',
      fecha_fin: '2026-07-31',
    };

    await expect(service.asignarTurno(dto)).rejects.toThrow(ConflictException);
  });
});
