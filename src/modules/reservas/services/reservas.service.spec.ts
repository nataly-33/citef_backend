import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReservasService } from './reservas.service';
import { ReservaSala, EstadoReserva } from '../entities/reserva-sala.entity';
import { Docente } from '../../catalogos/entities/docente.entity';
import { Materia } from '../../catalogos/entities/materia.entity';
import { LaboratorioSala } from '../../infraestructura/entities/laboratorio-sala.entity';
import { AlgoritmoDisponibilidadService } from './algoritmo-disponibilidad.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { ReservasGateway } from '../gateways/reservas.gateway';
import { AccionResolucionReserva } from '../dto/responder-reserva.dto';
import { ConflictException } from '@nestjs/common';

describe('ReservasService', () => {
  let service: ReservasService;

  const mockReservaRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockDocenteRepo = {
    findOne: jest.fn(),
  };

  const mockMateriaRepo = {
    findOne: jest.fn(),
  };

  const mockSalaRepo = {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([
      { id_sala: 1, codigo_sala: 'LAB-1', nombre: 'Sala 1', cant_estudiantes: 30, activo: true, estado_operativo: 'OPERATIVA' },
    ]),
  };

  const mockAlgoritmoService = {
    validarDisponibilidad: jest.fn(),
  };

  const mockAuditoriaService = {
    registrar: jest.fn().mockResolvedValue({}),
  };

  const mockReservasGateway = {
    emitirActualizacionReservas: jest.fn(),
    emitirActualizacion: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservasService,
        {
          provide: getRepositoryToken(ReservaSala),
          useValue: mockReservaRepo,
        },
        {
          provide: getRepositoryToken(Docente),
          useValue: mockDocenteRepo,
        },
        {
          provide: getRepositoryToken(Materia),
          useValue: mockMateriaRepo,
        },
        {
          provide: getRepositoryToken(LaboratorioSala),
          useValue: mockSalaRepo,
        },
        {
          provide: AlgoritmoDisponibilidadService,
          useValue: mockAlgoritmoService,
        },
        {
          provide: AuditoriaService,
          useValue: mockAuditoriaService,
        },
        {
          provide: ReservasGateway,
          useValue: mockReservasGateway,
        },
      ],
    }).compile();

    service = module.get<ReservasService>(ReservasService);
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debe solicitar una reserva exitosamente cuando el horario está libre', async () => {
    const dto = {
      id_sala: 1,
      codigo_docente: 'DOC-1001',
      id_materia: 10,
      fecha_reserva: '2029-10-25',
      hora_inicio: '08:00',
      hora_fin: '10:00',
      tema_practica: 'Laboratorio de Microeconomía',
      cant_estimada_alumnos: 25,
    };

    mockDocenteRepo.findOne.mockResolvedValue({
      codigo: 'DOC-1001',
      id_usuario: 5,
    });
    mockMateriaRepo.findOne.mockResolvedValue({ id_materia: 10, nombre: 'Micro' });
    mockAlgoritmoService.validarDisponibilidad.mockResolvedValue({
      disponible: true,
      mensaje: 'OK',
    });

    const creada = { id_reserva: 1, ...dto, estado: EstadoReserva.PENDIENTE };
    mockReservaRepo.create.mockReturnValue(creada);
    mockReservaRepo.save.mockResolvedValue(creada);
    mockReservaRepo.findOne.mockResolvedValue(creada);

    const res = await service.solicitar(dto, { id_usuario: 5, roles: ['DOCENTE'] }, '127.0.0.1');

    expect(res).toBeDefined();
    expect(res.estado).toBe(EstadoReserva.PENDIENTE);
    expect(mockAuditoriaService.registrar).toHaveBeenCalled();
  });

  it('debe aprobar una reserva si no hay colisiones en el momento del dictamen', async () => {
    const reservaPendiente = {
      id_reserva: 1,
      id_sala: 1,
      fecha_reserva: '2029-10-25',
      hora_inicio: '08:00',
      hora_fin: '10:00',
      cant_estimada_alumnos: 25,
      estado: EstadoReserva.PENDIENTE,
      obs_resolucion: null,
    };

    mockReservaRepo.findOne.mockResolvedValue({ ...reservaPendiente });
    mockAlgoritmoService.validarDisponibilidad.mockResolvedValue({
      disponible: true,
      mensaje: 'Disponible',
    });
    mockReservaRepo.save.mockImplementation((entity) => Promise.resolve(entity));

    const res = await service.gestionar(
      1,
      {
        accion: AccionResolucionReserva.APROBAR,
        obs_resolucion: 'Aprobado formalmente',
      },
      { id_usuario: 1, roles: ['ADMINISTRADOR'] },
      '127.0.0.1',
    );

    expect(res.estado).toBe(EstadoReserva.APROBADA);
    expect(mockAuditoriaService.registrar).toHaveBeenCalled();
  });

  it('debe aprobar en lote todas las clases recurrentes pendientes del semestre', async () => {
    const clasePrincipal = {
      id_reserva: 1,
      id_sala: 1,
      fecha_reserva: '2029-10-25',
      hora_inicio: '08:00',
      hora_fin: '10:00',
      cant_estimada_alumnos: 25,
      estado: EstadoReserva.PENDIENTE,
      tipo_reserva: 'CLASE',
      codigo_docente: 'DOC-1001',
      id_materia: 10,
      id_lote_recurrente: 'SEM_123',
    };

    const claseRecurrente2 = {
      id_reserva: 2,
      id_sala: 1,
      fecha_reserva: '2029-11-01',
      hora_inicio: '08:00',
      hora_fin: '10:00',
      cant_estimada_alumnos: 25,
      estado: EstadoReserva.PENDIENTE,
      tipo_reserva: 'CLASE',
      codigo_docente: 'DOC-1001',
      id_materia: 10,
      id_lote_recurrente: 'SEM_123',
    };

    mockReservaRepo.findOne.mockResolvedValue({ ...clasePrincipal });
    mockReservaRepo.find.mockResolvedValue([claseRecurrente2]);
    mockAlgoritmoService.validarDisponibilidad.mockResolvedValue({
      disponible: true,
      mensaje: 'Disponible',
    });
    mockReservaRepo.save.mockImplementation((entity) => Promise.resolve(entity));

    const res = await service.gestionar(
      1,
      {
        accion: AccionResolucionReserva.APROBAR,
        obs_resolucion: 'Aprobación semestral',
        aprobar_todas_recurrentes: true,
      },
      { id_usuario: 1, roles: ['ADMINISTRADOR'] },
      '127.0.0.1',
    );

    expect(res.estado).toBe(EstadoReserva.APROBADA);
    expect(mockReservaRepo.save).toHaveBeenCalledTimes(2); // Principal + Recurrente 2
  });

  it('debe rechazar la aprobación si se detecta colisión horaria insalvable', async () => {
    const reservaPendiente = {
      id_reserva: 1,
      id_sala: 1,
      fecha_reserva: '2029-10-25',
      hora_inicio: '08:00',
      hora_fin: '10:00',
      cant_estimada_alumnos: 25,
      estado: EstadoReserva.PENDIENTE,
    };

    mockReservaRepo.findOne.mockResolvedValue({ ...reservaPendiente });
    mockAlgoritmoService.validarDisponibilidad.mockResolvedValue({
      disponible: false,
      mensaje: 'Conflicto con otra reserva',
    });

    await expect(
      service.gestionar(
        1,
        { accion: AccionResolucionReserva.APROBAR },
        { id_usuario: 1, roles: ['ADMINISTRADOR'] },
        '127.0.0.1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('debe editar la sala de una reserva actualizando id_sala en BD (ej: reasignar a LAB-46)', async () => {
    const reservaOriginal = {
      id_reserva: 10,
      id_sala: 1,
      fecha_reserva: '2029-10-25',
      hora_inicio: '08:00',
      hora_fin: '10:00',
      cant_estimada_alumnos: 10,
      tema_practica: 'Práctica de Redes',
      tipo_reserva: 'CLASE',
      estado: EstadoReserva.PENDIENTE,
      docente: { id_usuario: 5, codigo: 'DOC-1001' },
      id_grupo_multisala: null,
    };

    mockReservaRepo.findOne
      .mockResolvedValueOnce(reservaOriginal) // primera llamada en editar()
      .mockResolvedValueOnce({ ...reservaOriginal, id_sala: 3 }); // llamada en obtenerPorId()

    mockSalaRepo.find.mockResolvedValueOnce([
      { id_sala: 3, codigo_sala: 'LAB-46', nombre: 'Sala 46', cant_estudiantes: 10, activo: true, estado_operativo: 'OPERATIVA' },
    ]);

    mockAlgoritmoService.validarDisponibilidad.mockResolvedValue({
      disponible: true,
      mensaje: 'Disponible',
    });

    mockReservaRepo.update.mockResolvedValue({ affected: 1 });

    const resultado = await service.editar(
      10,
      { id_sala: 3, cant_estimada_alumnos: 10 },
      { id_usuario: 1, roles: ['ADMINISTRADOR'] },
      '127.0.0.1',
    );

    expect(mockReservaRepo.update).toHaveBeenCalledWith(
      10,
      expect.objectContaining({
        id_sala: 3,
        id_grupo_multisala: null,
      }),
    );
    expect(resultado.id_sala).toBe(3);
  });
});
