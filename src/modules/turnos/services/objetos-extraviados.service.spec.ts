import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ObjetosExtraviadosService } from './objetos-extraviados.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import {
  CategoriaObjeto,
  EstadoObjeto,
} from '../entities/objeto-extraviado.entity';
import { EstadoJornada } from '../entities/jornada-turno.entity';

describe('ObjetosExtraviadosService (CU23: Gestión de Objetos Extraviados)', () => {
  let service: ObjetosExtraviadosService;
  let mockObjetoRepo: any;
  let mockSalaRepo: any;
  let mockEstudianteRepo: any;
  let mockJornadaRepo: any;
  let mockAuditoriaService: any;

  beforeEach(async () => {
    mockObjetoRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ id_objeto: 1, ...dto })),
      save: jest
        .fn()
        .mockImplementation((o) => Promise.resolve({ id_objeto: 1, ...o })),
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

    mockSalaRepo = {
      findOne: jest.fn(),
    };

    mockEstudianteRepo = {
      findOne: jest.fn(),
    };

    mockJornadaRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((j) => Promise.resolve(j)),
    };

    mockAuditoriaService = {
      registrar: jest.fn().mockResolvedValue({ id_auditoria: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ObjetosExtraviadosService,
        { provide: 'ObjetoExtraviadoRepository', useValue: mockObjetoRepo },
        { provide: 'LaboratorioSalaRepository', useValue: mockSalaRepo },
        { provide: 'EstudianteRepository', useValue: mockEstudianteRepo },
        { provide: 'JornadaTurnoRepository', useValue: mockJornadaRepo },
        { provide: AuditoriaService, useValue: mockAuditoriaService },
      ],
    }).compile();

    service = module.get<ObjetosExtraviadosService>(ObjetosExtraviadosService);
  });

  it('debe estar definido el servicio de objetos extraviados', () => {
    expect(service).toBeDefined();
  });

  describe('registrarObjeto', () => {
    it('debe registrar objeto en custodia e incrementar jornada activa', async () => {
      mockSalaRepo.findOne.mockResolvedValue({ id_sala: 1 });
      mockJornadaRepo.findOne.mockResolvedValue({
        id_jornada: 7,
        id_sala: 1,
        estado: EstadoJornada.EN_CURSO,
        cant_objetos_custodiados: 0,
      });

      const res = await service.registrarObjeto(
        {
          id_sala: 1,
          categoria: CategoriaObjeto.ELECTRONICA,
          descrip_detallada: 'Pendrive Kingston 64GB color rojo',
          lugar_exacto: 'Estación de cómputo L1-PC04',
        },
        3,
        '127.0.0.1',
      );

      expect(res).toBeDefined();
      expect(res.estado).toBe(EstadoObjeto.BAJO_CUSTODIA);
      expect(res.id_jornada_hallazgo).toBe(7);
      expect(mockJornadaRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ cant_objetos_custodiados: 1 }),
      );
      expect(mockAuditoriaService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'REGISTRAR_OBJETO_EXTRAVIADO' }),
      );
    });

    it('debe rechazar registro si la sala no existe', async () => {
      mockSalaRepo.findOne.mockResolvedValue(null);

      await expect(
        service.registrarObjeto(
          {
            id_sala: 999,
            categoria: CategoriaObjeto.OTRO,
            descrip_detallada: 'Cuaderno espiral',
            lugar_exacto: 'Mesa docente',
          },
          3,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('devolverObjeto', () => {
    it('debe devolver objeto exitosamente al estudiante receptor registrado', async () => {
      mockObjetoRepo.findOne.mockResolvedValue({
        id_objeto: 1,
        estado: EstadoObjeto.BAJO_CUSTODIA,
        descrip_detallada: 'Calculadora científica Casio fx-991LA',
      });

      mockEstudianteRepo.findOne.mockResolvedValue({
        registro: '220011502',
        nombres: 'MARIANA SILVANA',
        apellidos: 'CLAURE ROJAS',
      });

      const res = await service.devolverObjeto(
        1,
        {
          registro_estudiante_receptor: '220011502',
          obs_devolucion: 'Presentó carnet de identidad para retiro',
        },
        3,
        '127.0.0.1',
      );

      expect(res.estado).toBe(EstadoObjeto.DEVUELTO);
      expect(res.registro_estudiante_receptor).toBe('220011502');
      expect(res.id_usuario_entrega).toBe(3);
      expect(res.fecha_hora_devolucion).toBeDefined();
      expect(mockAuditoriaService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'DEVOLVER_OBJETO_EXTRAVIADO' }),
      );
    });

    it('debe rechazar si el objeto no existe', async () => {
      mockObjetoRepo.findOne.mockResolvedValue(null);

      await expect(
        service.devolverObjeto(
          99,
          { registro_estudiante_receptor: '220011501' },
          3,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe rechazar si el objeto ya fue devuelto previamente', async () => {
      mockObjetoRepo.findOne.mockResolvedValue({
        id_objeto: 1,
        estado: EstadoObjeto.DEVUELTO,
      });

      await expect(
        service.devolverObjeto(
          1,
          { registro_estudiante_receptor: '220011501' },
          3,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar si el estudiante receptor no está registrado', async () => {
      mockObjetoRepo.findOne.mockResolvedValue({
        id_objeto: 1,
        estado: EstadoObjeto.BAJO_CUSTODIA,
      });
      mockEstudianteRepo.findOne.mockResolvedValue(null);

      await expect(
        service.devolverObjeto(
          1,
          { registro_estudiante_receptor: '000000000' },
          3,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getObjetoById', () => {
    it('debe retornar el objeto con sus relaciones sanitizadas', async () => {
      mockObjetoRepo.findOne.mockResolvedValue({
        id_objeto: 1,
        descrip_detallada: 'Mochila negra',
        usuario_registro: {
          id_usuario: 1,
          nombres: 'Auxiliar',
          password_hash: 'secret',
        },
      });

      const res = await service.getObjetoById(1);

      expect(res).toBeDefined();
      expect((res.usuario_registro as any).password_hash).toBeUndefined();
    });

    it('debe rechazar si no se encuentra el objeto', async () => {
      mockObjetoRepo.findOne.mockResolvedValue(null);

      await expect(service.getObjetoById(99)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
