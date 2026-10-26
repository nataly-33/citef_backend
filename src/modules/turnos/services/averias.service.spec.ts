import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { AveriasService } from './averias.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import {
  TipoFalla,
  GravedadAveria,
  EstadoAveria,
} from '../entities/averia-equipo.entity';
import { EstadoJornada } from '../entities/jornada-turno.entity';
import {
  MantenimientoTaller,
  EstadoMantenimiento,
  TipoMantenimiento,
  PrioridadMantenimiento,
} from '../../soporte/entities/mantenimiento-taller.entity';

describe('AveriasService (CU22: Reporte de Averías e Incidencias Técnicas)', () => {
  let service: AveriasService;
  let mockAveriaRepo: any;
  let mockComputadoraRepo: any;
  let mockSesionRepo: any;
  let mockJornadaRepo: any;
  let mockReservaRepo: any;
  let mockMantenimientoRepo: any;
  let mockAuditoriaService: any;

  beforeEach(async () => {
    mockAveriaRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ id_averia: 1, ...dto })),
      save: jest
        .fn()
        .mockImplementation((a) => Promise.resolve({ id_averia: 1, ...a })),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }),
    };

    mockComputadoraRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((c) => Promise.resolve(c)),
    };

    mockSesionRepo = {
      findOne: jest.fn(),
    };

    mockJornadaRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((j) => Promise.resolve(j)),
    };

    mockReservaRepo = {
      findOne: jest.fn(),
    };

    mockMantenimientoRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest
        .fn()
        .mockImplementation((dto) => ({ id_mantenimiento: 1, ...dto })),
      save: jest
        .fn()
        .mockImplementation((m) =>
          Promise.resolve({ id_mantenimiento: 1, ...m }),
        ),
    };

    mockAuditoriaService = {
      registrar: jest.fn().mockResolvedValue({ id_auditoria: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AveriasService,
        { provide: 'AveriaEquipoRepository', useValue: mockAveriaRepo },
        { provide: 'ComputadoraRepository', useValue: mockComputadoraRepo },
        { provide: 'AsignacionSesionRepository', useValue: mockSesionRepo },
        { provide: 'JornadaTurnoRepository', useValue: mockJornadaRepo },
        { provide: 'ReservaSalaRepository', useValue: mockReservaRepo },
        {
          provide: getRepositoryToken(MantenimientoTaller),
          useValue: mockMantenimientoRepo,
        },
        { provide: AuditoriaService, useValue: mockAuditoriaService },
      ],
    }).compile();

    service = module.get<AveriasService>(AveriasService);
  });

  it('debe estar definido el servicio de averías', () => {
    expect(service).toBeDefined();
  });

  describe('reportarAveria', () => {
    it('debe reportar avería, buscar último estudiante y conmutar PC a EN_MANTENIMIENTO', async () => {
      mockComputadoraRepo.findOne.mockResolvedValue({
        id_computadora: 5,
        id_sala: 1,
        estado_actual: 'DISPONIBLE',
      });

      mockSesionRepo.findOne.mockResolvedValue({
        id_computadora: 5,
        registro_estudiante: '220011501',
      });

      mockJornadaRepo.findOne.mockResolvedValue({
        id_jornada: 10,
        id_sala: 1,
        estado: EstadoJornada.EN_CURSO,
        cant_averias_reportadas: 0,
      });

      const res = await service.reportarAveria(
        {
          id_computadora: 5,
          tipo_falla: TipoFalla.HARDWARE,
          descrip_falla: 'Teclado no responde teclas barra espaciadora',
          gravedad: GravedadAveria.MEDIA,
        },
        3,
        '127.0.0.1',
      );

      expect(res).toBeDefined();
      expect(mockComputadoraRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ estado_actual: 'EN_MANTENIMIENTO' }),
      );
      expect(res.registro_ultimo_estudiante).toBe('220011501');
      expect(res.id_jornada).toBe(10);
      expect(mockJornadaRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ cant_averias_reportadas: 1 }),
      );
      expect(mockAuditoriaService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'REPORTAR_AVERIA' }),
      );
    });

    it('debe respetar el registro_ultimo_estudiante si se pasa explícitamente en el DTO', async () => {
      mockComputadoraRepo.findOne.mockResolvedValue({
        id_computadora: 5,
        id_sala: 1,
        estado_actual: 'DISPONIBLE',
      });

      const res = await service.reportarAveria(
        {
          id_computadora: 5,
          tipo_falla: TipoFalla.SOFTWARE,
          descrip_falla: 'Pantalla azul de windows al iniciar sesion',
          registro_ultimo_estudiante: '220011509',
        },
        3,
      );

      expect(res.registro_ultimo_estudiante).toBe('220011509');
      expect(mockSesionRepo.findOne).not.toHaveBeenCalled();
    });

    it('debe rechazar si la computadora no existe', async () => {
      mockComputadoraRepo.findOne.mockResolvedValue(null);

      await expect(
        service.reportarAveria(
          {
            id_computadora: 999,
            tipo_falla: TipoFalla.PERIFERICO,
            descrip_falla: 'Mouse roto',
          },
          3,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUltimoUsuarioComputadora', () => {
    it('debe devolver la información contextual del último usuario y sesión', async () => {
      mockComputadoraRepo.findOne.mockResolvedValue({
        id_computadora: 5,
        id_sala: 1,
      });

      mockSesionRepo.findOne.mockResolvedValue({
        id_computadora: 5,
        estudiante: {
          registro: '220011501',
          nombres: 'CARLOS ANDRÉS',
          apellidos: 'VARGAS PINTO',
        },
      });

      const res = await service.getUltimoUsuarioComputadora(5);

      expect(res.computadora).toBeDefined();
      expect(res.ultimo_estudiante).toBeDefined();
      expect(res.ultimo_estudiante?.registro).toBe('220011501');
    });

    it('debe rechazar si la computadora no existe', async () => {
      mockComputadoraRepo.findOne.mockResolvedValue(null);

      await expect(service.getUltimoUsuarioComputadora(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('cambiarEstadoAveria', () => {
    it('debe cambiar estado a EN_TALLER, crear orden de taller si no existe y conmutar PC a EN_MANTENIMIENTO', async () => {
      const pcMock = {
        id_computadora: 5,
        estado_actual: 'DISPONIBLE',
      };

      mockAveriaRepo.findOne.mockResolvedValue({
        id_averia: 1,
        id_computadora: 5,
        descrip_falla: 'Ingresado al taller para cambio de cable flex',
        gravedad: GravedadAveria.CRITICA,
        estado: EstadoAveria.PENDIENTE_REVISION,
        computadora: pcMock,
      });

      mockMantenimientoRepo.findOne.mockResolvedValue(null);

      const res = await service.cambiarEstadoAveria(
        1,
        {
          estado: EstadoAveria.EN_TALLER,
          solucion_tecnica: 'Ingresado al taller para cambio de cable flex',
        },
        5,
        '127.0.0.1',
      );

      expect(res.estado).toBe(EstadoAveria.EN_TALLER);
      expect(mockMantenimientoRepo.findOne).toHaveBeenCalledWith({
        where: { id_averia: 1 },
      });
      expect(mockMantenimientoRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id_computadora: 5,
          id_averia: 1,
          id_usuario_administrador: 5,
          estado: EstadoMantenimiento.PENDIENTE_TALLER,
          tipo_mantenimiento: TipoMantenimiento.CORRECTIVO,
          prioridad: PrioridadMantenimiento.CRITICA,
          descripcion_problema: 'Ingresado al taller para cambio de cable flex',
        }),
      );
      expect(mockMantenimientoRepo.save).toHaveBeenCalled();
      expect(pcMock.estado_actual).toBe('EN_MANTENIMIENTO');
      expect(mockComputadoraRepo.save).toHaveBeenCalledWith(pcMock);
      expect(mockAuditoriaService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'ACTUALIZAR_ESTADO_AVERIA' }),
      );
    });

    it('no debe duplicar orden de taller si ya existe una para la avería al pasar a EN_TALLER', async () => {
      const pcMock = {
        id_computadora: 5,
        estado_actual: 'EN_MANTENIMIENTO',
      };

      mockAveriaRepo.findOne.mockResolvedValue({
        id_averia: 1,
        id_computadora: 5,
        descrip_falla: 'Falla existente',
        gravedad: GravedadAveria.MEDIA,
        estado: EstadoAveria.PENDIENTE_REVISION,
        computadora: pcMock,
      });

      mockMantenimientoRepo.findOne.mockResolvedValue({
        id_mantenimiento: 10,
        id_averia: 1,
      });

      await service.cambiarEstadoAveria(
        1,
        { estado: EstadoAveria.EN_TALLER },
        5,
      );

      expect(mockMantenimientoRepo.create).not.toHaveBeenCalled();
    });

    it('debe restablecer computadora a DISPONIBLE al marcar REPARADO', async () => {
      const pcMock = {
        id_computadora: 5,
        estado_actual: 'EN_MANTENIMIENTO',
      };

      mockAveriaRepo.findOne.mockResolvedValue({
        id_averia: 1,
        estado: EstadoAveria.EN_TALLER,
        computadora: pcMock,
      });

      const res = await service.cambiarEstadoAveria(
        1,
        {
          estado: EstadoAveria.REPARADO,
          solucion_tecnica: 'Fuente de poder reemplazada y probada',
        },
        5,
      );

      expect(res.estado).toBe(EstadoAveria.REPARADO);
      expect(res.fecha_solucion).toBeDefined();
      expect(pcMock.estado_actual).toBe('DISPONIBLE');
      expect(mockComputadoraRepo.save).toHaveBeenCalledWith(pcMock);
    });

    it('debe rechazar si la avería no existe', async () => {
      mockAveriaRepo.findOne.mockResolvedValue(null);

      await expect(
        service.cambiarEstadoAveria(99, { estado: EstadoAveria.REPARADO }, 5),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
