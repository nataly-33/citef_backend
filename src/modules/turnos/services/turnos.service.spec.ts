import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TurnosService } from './turnos.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { EstadoJornada } from '../entities/jornada-turno.entity';
import { EstadoAveria } from '../entities/averia-equipo.entity';
import { EstadoObjeto } from '../entities/objeto-extraviado.entity';

describe('TurnosService (CU21: Turnos de Guardia y Relevo)', () => {
  let service: TurnosService;
  let mockJornadaRepo: any;
  let mockActaRepo: any;
  let mockSalaRepo: any;
  let mockComputadoraRepo: any;
  let mockSesionRepo: any;
  let mockAveriaRepo: any;
  let mockObjetoRepo: any;
  let mockUsuarioRepo: any;
  let mockAuditoriaService: any;

  beforeEach(async () => {
    mockJornadaRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest
        .fn()
        .mockImplementation((dto) => ({ id_jornada: 1, ...dto })),
      save: jest
        .fn()
        .mockImplementation((j) => Promise.resolve({ id_jornada: 1, ...j })),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }),
    };

    mockActaRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest
        .fn()
        .mockImplementation((dto) => ({ id_acta_relevo: 1, ...dto })),
      save: jest
        .fn()
        .mockImplementation((a) =>
          Promise.resolve({ id_acta_relevo: 1, ...a }),
        ),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }),
    };

    mockSalaRepo = {
      findOne: jest.fn(),
    };

    mockComputadoraRepo = {
      count: jest.fn().mockResolvedValue(20),
    };

    mockSesionRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(15),
      }),
    };

    mockAveriaRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      }),
    };

    mockObjetoRepo = {
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      }),
    };

    mockUsuarioRepo = {
      findOne: jest.fn(),
    };

    mockAuditoriaService = {
      registrar: jest.fn().mockResolvedValue({ id_auditoria: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TurnosService,
        { provide: 'JornadaTurnoRepository', useValue: mockJornadaRepo },
        { provide: 'ActaRelevoRepository', useValue: mockActaRepo },
        { provide: 'LaboratorioSalaRepository', useValue: mockSalaRepo },
        { provide: 'ComputadoraRepository', useValue: mockComputadoraRepo },
        { provide: 'AsignacionSesionRepository', useValue: mockSesionRepo },
        { provide: 'AveriaEquipoRepository', useValue: mockAveriaRepo },
        { provide: 'ObjetoExtraviadoRepository', useValue: mockObjetoRepo },
        { provide: 'UsuarioRepository', useValue: mockUsuarioRepo },
        { provide: AuditoriaService, useValue: mockAuditoriaService },
      ],
    }).compile();

    service = module.get<TurnosService>(TurnosService);
  });

  it('debe estar definido el servicio de turnos', () => {
    expect(service).toBeDefined();
  });

  describe('abrirTurno', () => {
    it('debe abrir turno exitosamente si la sala y auxiliar no tienen turnos activos', async () => {
      mockSalaRepo.findOne.mockResolvedValue({
        id_sala: 1,
        codigo_sala: 'LAB-01',
      });
      mockJornadaRepo.findOne.mockResolvedValue(null);

      const res = await service.abrirTurno(
        {
          id_sala: 1,
          checklist_apertura: {
            luces: true,
            orden: true,
            aire: true,
            proyector: true,
            pcs_encendidas: true,
            observacion: 'Todo operativo',
          },
        },
        10,
        '127.0.0.1',
      );

      expect(res).toBeDefined();
      expect(res.estado).toBe(EstadoJornada.EN_CURSO);
      expect(mockAuditoriaService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'APERTURA_TURNO' }),
      );
    });

    it('debe lanzar NotFoundException si la sala no existe', async () => {
      mockSalaRepo.findOne.mockResolvedValue(null);

      await expect(
        service.abrirTurno(
          {
            id_sala: 99,
            checklist_apertura: {
              luces: true,
              orden: true,
              aire: true,
              proyector: true,
              pcs_encendidas: true,
            },
          },
          10,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe rechazar apertura si ya hay una jornada activa en la sala', async () => {
      mockSalaRepo.findOne.mockResolvedValue({
        id_sala: 1,
        codigo_sala: 'LAB-01',
      });
      mockJornadaRepo.findOne.mockResolvedValueOnce({
        id_jornada: 5,
        estado: EstadoJornada.EN_CURSO,
      });

      await expect(
        service.abrirTurno(
          {
            id_sala: 1,
            checklist_apertura: {
              luces: true,
              orden: true,
              aire: true,
              proyector: true,
              pcs_encendidas: true,
            },
          },
          10,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar apertura si el auxiliar ya tiene una jornada activa', async () => {
      mockSalaRepo.findOne.mockResolvedValue({
        id_sala: 2,
        codigo_sala: 'LAB-02',
      });
      mockJornadaRepo.findOne
        .mockResolvedValueOnce(null) // no hay turno en sala 2
        .mockResolvedValueOnce({
          id_jornada: 8,
          id_sala: 1,
          estado: EstadoJornada.EN_CURSO,
        }); // auxiliar ya en turno

      await expect(
        service.abrirTurno(
          {
            id_sala: 2,
            checklist_apertura: {
              luces: true,
              orden: true,
              aire: true,
              proyector: true,
              pcs_encendidas: true,
            },
          },
          10,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cerrarTurno', () => {
    it('debe cerrar turno como CERRADO_NORMAL si no hubo averías ni objetos', async () => {
      mockJornadaRepo.findOne.mockResolvedValue({
        id_jornada: 1,
        id_sala: 1,
        hora_apertura: new Date(Date.now() - 3600000),
        estado: EstadoJornada.EN_CURSO,
      });

      mockSesionRepo.createQueryBuilder().getCount.mockResolvedValue(12);
      mockAveriaRepo.createQueryBuilder().getCount.mockResolvedValue(0);
      mockObjetoRepo.createQueryBuilder().getCount.mockResolvedValue(0);

      const res = await service.cerrarTurno(
        1,
        { obs_cierre: undefined },
        10,
        '127.0.0.1',
      );

      expect(res.estado).toBe(EstadoJornada.CERRADO_NORMAL);
      expect(res.cant_estudiantes_atendidos).toBe(12);
      expect(mockAuditoriaService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'CIERRE_TURNO' }),
      );
    });

    it('debe cerrar turno como CERRADO_CON_NOVEDADES si se reportaron averías u observaciones', async () => {
      mockJornadaRepo.findOne.mockResolvedValue({
        id_jornada: 1,
        id_sala: 1,
        hora_apertura: new Date(Date.now() - 3600000),
        estado: EstadoJornada.EN_CURSO,
      });

      mockAveriaRepo.createQueryBuilder().getCount.mockResolvedValue(2);

      const res = await service.cerrarTurno(
        1,
        { obs_cierre: 'Falla en proyector' },
        10,
      );

      expect(res.estado).toBe(EstadoJornada.CERRADO_CON_NOVEDADES);
      expect(res.cant_averias_reportadas).toBe(2);
    });

    it('debe rechazar cierre si la jornada no existe', async () => {
      mockJornadaRepo.findOne.mockResolvedValue(null);

      await expect(service.cerrarTurno(99, {}, 10)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe rechazar cierre si la jornada ya está cerrada', async () => {
      mockJornadaRepo.findOne.mockResolvedValue({
        id_jornada: 1,
        estado: EstadoJornada.CERRADO_NORMAL,
      });

      await expect(service.cerrarTurno(1, {}, 10)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('crearActaRelevo y firmarActaRelevo', () => {
    it('debe crear acta de relevo computando equipos operativos y averías', async () => {
      mockJornadaRepo.findOne.mockResolvedValue({
        id_jornada: 1,
        id_sala: 1,
        estado: EstadoJornada.EN_CURSO,
      });
      mockUsuarioRepo.findOne.mockResolvedValue({ id_usuario: 20 });
      mockComputadoraRepo.count.mockResolvedValue(22);
      mockAveriaRepo.createQueryBuilder().getCount.mockResolvedValue(1);
      mockObjetoRepo.count.mockResolvedValue(2);

      const acta = await service.crearActaRelevo(
        1,
        { id_usuario_entrante: 20, novedades: 'Todo en orden' },
        10,
        '127.0.0.1',
      );

      expect(acta).toBeDefined();
      expect(acta.cant_equipos_operativos).toBe(22);
      expect(acta.cant_averias_pend).toBe(1);
      expect(acta.cant_objetos_custodia).toBe(2);
      expect(acta.aceptado_por_entrante).toBe(false);
      expect(mockAuditoriaService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'CREAR_ACTA_RELEVO' }),
      );
    });

    it('debe firmar acta de relevo con conformidad', async () => {
      mockActaRepo.findOne.mockResolvedValue({
        id_acta_relevo: 1,
        aceptado_por_entrante: false,
      });

      const res = await service.firmarActaRelevo(
        1,
        { aceptado: true, obs_discrepancia: undefined },
        20,
        '127.0.0.1',
      );

      expect(res.aceptado_por_entrante).toBe(true);
      expect(res.fecha_hora_conformidad).toBeDefined();
      expect(mockAuditoriaService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'FIRMA_ACTA_RELEVO' }),
      );
    });

    it('debe rechazar la firma si el acta ya fue firmada previamente', async () => {
      mockActaRepo.findOne.mockResolvedValue({
        id_acta_relevo: 1,
        aceptado_por_entrante: true,
      });

      await expect(
        service.firmarActaRelevo(1, { aceptado: true }, 20),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
