import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { HorariosService } from './horarios.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';

describe('HorariosService (CU6: Gestión de Horarios)', () => {
  let service: HorariosService;
  let mockHorarioRepo: any;
  let mockAuditoriaService: any;

  beforeEach(async () => {
    mockHorarioRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ id_horario: 1, ...dto })),
      save: jest.fn().mockImplementation((h) => Promise.resolve(h)),
      createQueryBuilder: jest.fn().mockReturnValue({
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [{ id_horario: 1, turno: 'MAÑANA', hora_inicio: '07:00:00', hora_fin: '12:00:00', activo: true }],
          1,
        ]),
      }),
    };

    mockAuditoriaService = {
      registrar: jest.fn().mockResolvedValue({ id_auditoria: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HorariosService,
        { provide: 'HorarioOperativoRepository', useValue: mockHorarioRepo },
        { provide: AuditoriaService, useValue: mockAuditoriaService },
      ],
    }).compile();

    service = module.get<HorariosService>(HorariosService);
  });

  it('debe estar definido el servicio de horarios', () => {
    expect(service).toBeDefined();
  });

  it('debe permitir crear un horario válido donde hora_inicio < hora_fin', async () => {
    const dto = {
      turno: 'MAÑANA',
      hora_inicio: '07:00:00',
      hora_fin: '12:00:00',
    };

    const res = await service.crear(dto, { id_usuario: 1, correo: 'admin@uagrm.edu.bo' }, '127.0.0.1');
    expect(res.turno).toBe('MAÑANA');
    expect(mockHorarioRepo.save).toHaveBeenCalled();
  });

  it('debe rechazar la creación si hora_inicio >= hora_fin (BadRequestException)', async () => {
    const dtoInvalido = {
      turno: 'MAÑANA',
      hora_inicio: '12:00:00',
      hora_fin: '07:00:00',
    };

    await expect(service.crear(dtoInvalido)).rejects.toThrow(BadRequestException);
  });
});
