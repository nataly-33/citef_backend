import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AlgoritmoDisponibilidadService } from './algoritmo-disponibilidad.service';
import { ReservaSala, EstadoReserva } from '../entities/reserva-sala.entity';
import { LaboratorioSala } from '../../infraestructura/entities/laboratorio-sala.entity';
import { BadRequestException } from '@nestjs/common';

describe('AlgoritmoDisponibilidadService', () => {
  let service: AlgoritmoDisponibilidadService;

  const mockSala: Partial<LaboratorioSala> = {
    id_sala: 1,
    codigo_sala: 'LAB-01',
    cant_estudiantes: 30,
    activo: true,
    estado_operativo: 'OPERATIVA',
  };

  const mockSalaRepo = {
    findOne: jest.fn(),
  };

  const mockReservaRepo = {
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlgoritmoDisponibilidadService,
        {
          provide: getRepositoryToken(ReservaSala),
          useValue: mockReservaRepo,
        },
        {
          provide: getRepositoryToken(LaboratorioSala),
          useValue: mockSalaRepo,
        },
      ],
    }).compile();

    service = module.get<AlgoritmoDisponibilidadService>(
      AlgoritmoDisponibilidadService,
    );
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debe rechazar reservas con hora_fin <= hora_inicio', async () => {
    mockSalaRepo.findOne.mockResolvedValue(mockSala);

    await expect(
      service.validarDisponibilidad(1, '2029-10-25', '10:00', '09:00', 20),
    ).rejects.toThrow(BadRequestException);
  });

  it('debe rechazar reservas con duración menor a 45 minutos', async () => {
    mockSalaRepo.findOne.mockResolvedValue(mockSala);

    await expect(
      service.validarDisponibilidad(1, '2029-10-25', '10:00', '10:30', 20),
    ).rejects.toThrow(BadRequestException);
  });

  it('debe rechazar reservas que excedan la capacidad de la sala', async () => {
    mockSalaRepo.findOne.mockResolvedValue(mockSala);

    await expect(
      service.validarDisponibilidad(1, '2029-10-25', '10:00', '12:00', 35),
    ).rejects.toThrow(BadRequestException);
  });

  it('debe confirmar disponibilidad si no hay reservas aprobadas colisionando', async () => {
    mockSalaRepo.findOne.mockResolvedValue(mockSala);

    const qbMock: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    mockReservaRepo.createQueryBuilder.mockReturnValue(qbMock);

    const resultado = await service.validarDisponibilidad(
      1,
      '2029-10-25',
      '08:00',
      '10:00',
      25,
    );

    expect(resultado.disponible).toBe(true);
    expect(resultado.mensaje).toContain('Horario plenamente disponible');
  });

  it('debe detectar conflicto horario si existe solapamiento con reserva aprobada', async () => {
    mockSalaRepo.findOne.mockResolvedValue(mockSala);

    const reservaConflicto: Partial<ReservaSala> = {
      id_reserva: 99,
      id_sala: 1,
      codigo_docente: 'DOC-1001',
      fecha_reserva: '2029-10-25',
      hora_inicio: '09:00',
      hora_fin: '11:00',
      estado: EstadoReserva.APROBADA,
    };

    const qbMock: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(reservaConflicto),
    };
    mockReservaRepo.createQueryBuilder.mockReturnValue(qbMock);

    const resultado = await service.validarDisponibilidad(
      1,
      '2029-10-25',
      '08:00',
      '10:00',
      20,
    );

    expect(resultado.disponible).toBe(false);
    expect(resultado.mensaje).toContain('Conflicto horario');
    expect(resultado.reservaConflicto).toBeDefined();
  });
});
