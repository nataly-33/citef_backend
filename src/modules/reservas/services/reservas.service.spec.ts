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
});
