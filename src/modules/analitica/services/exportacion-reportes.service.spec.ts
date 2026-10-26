import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ExportacionReportesService } from './exportacion-reportes.service';
import { DocumentoReporteExportado } from '../entities/documento-reporte-exportado.entity';
import { ReservaSala, TipoReserva } from '../../reservas/entities/reserva-sala.entity';
import { LaboratorioSala } from '../../infraestructura/entities/laboratorio-sala.entity';
import { Computadora } from '../../infraestructura/entities/computadora.entity';
import { AveriaEquipo } from '../../turnos/entities/averia-equipo.entity';
import { BitacoraAuditoria } from '../../auditoria/entities/bitacora-auditoria.entity';
import { AuditoriaService } from '../../auditoria/auditoria.service';

describe('ExportacionReportesService (CU27: Generación de Excel y PDF Oficial)', () => {
  let service: ExportacionReportesService;
  let mockDocRepo: any;
  let mockReservaRepo: any;
  let mockSalaRepo: any;
  let mockComputadoraRepo: any;
  let mockAveriaRepo: any;
  let mockBitacoraRepo: any;
  let mockAuditoriaService: any;

  beforeEach(async () => {
    mockDocRepo = {
      create: jest.fn().mockImplementation((dto) => ({
        id_documento: 1,
        ...dto,
      })),
      save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
    };

    const resQb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id_reserva: 1,
          codigo_docente: 'DOC-1001',
          id_materia: 10,
          id_sala: 1,
          fecha_reserva: '2026-03-10',
          hora_inicio: '08:00:00',
          hora_fin: '10:00:00',
          cant_estimada_alumnos: 24,
          tipo_reserva: TipoReserva.CLASE,
          estado: 'APROBADA',
          tema_practica: 'Modelado en Excel',
          sala: { nombre: 'Lab CITEF 1' },
          docente: { codigo: 'DOC-1001' },
          materia: { nombre: 'Cálculo I' },
        },
      ]),
    };

    mockReservaRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(resQb),
    };

    mockSalaRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id_sala: 1,
          codigo_sala: 'LAB-01',
          nombre: 'Laboratorio de Informática 1',
          piso: 1,
          cant_estudiantes: 24,
          estado_operativo: 'OPERATIVA',
          computadoras: [
            { id_computadora: 1, estado_actual: 'OCUPADA' },
            { id_computadora: 2, estado_actual: 'DISPONIBLE' },
          ],
        },
      ]),
    };

    const compQb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id_computadora: 1,
          codigo_equipo: 'L1-PC01',
          id_sala: 1,
          posicion_fila: 1,
          posicion_columna: 1,
          horas_uso_acumuladas: 25.5,
          estado_actual: 'DISPONIBLE',
          sala: { nombre: 'Lab CITEF 1' },
        },
      ]),
    };

    mockComputadoraRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(compQb),
    };

    mockAveriaRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    const bitacoraQb: any = {
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id_auditoria: 1,
          fecha_hora: new Date(),
          id_usuario: 1,
          correo_usuario: 'admin@uagrm.edu.bo',
          accion: 'LOGIN',
          tabla_afectada: 'usuario',
          id_registro_afectado: '1',
          ip_cliente: '127.0.0.1',
        },
      ]),
    };

    mockBitacoraRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(bitacoraQb),
    };

    mockAuditoriaService = {
      registrar: jest.fn().mockResolvedValue({ id_auditoria: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportacionReportesService,
        {
          provide: getRepositoryToken(DocumentoReporteExportado),
          useValue: mockDocRepo,
        },
        {
          provide: getRepositoryToken(ReservaSala),
          useValue: mockReservaRepo,
        },
        {
          provide: getRepositoryToken(LaboratorioSala),
          useValue: mockSalaRepo,
        },
        {
          provide: getRepositoryToken(Computadora),
          useValue: mockComputadoraRepo,
        },
        {
          provide: getRepositoryToken(AveriaEquipo),
          useValue: mockAveriaRepo,
        },
        {
          provide: getRepositoryToken(BitacoraAuditoria),
          useValue: mockBitacoraRepo,
        },
        {
          provide: AuditoriaService,
          useValue: mockAuditoriaService,
        },
      ],
    }).compile();

    service = module.get<ExportacionReportesService>(
      ExportacionReportesService,
    );
  });

  it('debe estar definido el servicio de exportación de reportes', () => {
    expect(service).toBeDefined();
  });

  describe('getCatalogoReportes', () => {
    it('debe retornar exactamente los 5 reportes oficiales institucionales de la FCEE', () => {
      const catalogo = service.getCatalogoReportes();

      expect(catalogo).toHaveLength(5);
      const codigos = catalogo.map((c) => c.codigo);
      expect(codigos).toContain('REP_CATEDRAS');
      expect(codigos).toContain('REP_OCUPACION');
      expect(codigos).toContain('REP_RAMS');
      expect(codigos).toContain('REP_EVALUACIONES');
      expect(codigos).toContain('REP_AUDITORIA');
    });
  });

  describe('generarReporteExcel', () => {
    it('debe generar un libro Excel real (.xlsx) con hash SHA-256 para REP_CATEDRAS', async () => {
      const res = await service.generarReporteExcel(
        { codigo_reporte: 'REP_CATEDRAS', formato: 'EXCEL' },
        1,
      );

      expect(res).toBeDefined();
      expect(res.buffer).toBeInstanceOf(Buffer);
      expect(res.buffer.length).toBeGreaterThan(0);
      expect(res.filename).toContain('REP_CATEDRAS');
      expect(res.filename).toMatch(/\.xlsx$/);
      expect(res.hash_sha256).toHaveLength(64);
      expect(res.total_registros).toBe(1);

      // Verificación de persistencia y auditoría
      expect(mockDocRepo.save).toHaveBeenCalled();
      expect(mockAuditoriaService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'EXPORTAR_REPORTE_EXCEL',
          tabla_afectada: 'documento_reporte_exportado',
        }),
      );
    });

    it('debe generar reporte Excel para REP_OCUPACION', async () => {
      const res = await service.generarReporteExcel(
        { codigo_reporte: 'REP_OCUPACION', formato: 'EXCEL' },
        1,
      );

      expect(res.buffer).toBeInstanceOf(Buffer);
      expect(res.filename).toContain('REP_OCUPACION');
      expect(res.hash_sha256).toHaveLength(64);
    });

    it('debe generar reporte Excel para REP_RAMS', async () => {
      const res = await service.generarReporteExcel(
        { codigo_reporte: 'REP_RAMS', formato: 'EXCEL' },
        1,
      );

      expect(res.buffer).toBeInstanceOf(Buffer);
      expect(res.filename).toContain('REP_RAMS');
    });

    it('debe generar reporte Excel para REP_EVALUACIONES', async () => {
      const res = await service.generarReporteExcel(
        { codigo_reporte: 'REP_EVALUACIONES', formato: 'EXCEL' },
        1,
      );

      expect(res.buffer).toBeInstanceOf(Buffer);
      expect(res.filename).toContain('REP_EVALUACIONES');
    });

    it('debe generar reporte Excel para REP_AUDITORIA', async () => {
      const res = await service.generarReporteExcel(
        { codigo_reporte: 'REP_AUDITORIA', formato: 'EXCEL' },
        1,
      );

      expect(res.buffer).toBeInstanceOf(Buffer);
      expect(res.filename).toContain('REP_AUDITORIA');
    });

    it('debe lanzar NotFoundException si el código de reporte no existe', async () => {
      await expect(
        service.generarReporteExcel(
          { codigo_reporte: 'REP_INVENTADO', formato: 'EXCEL' },
          1,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('generarDatosReportePdf', () => {
    it('debe retornar estructura institucional formal para PDF con metadatos y hash SHA-256', async () => {
      const res = await service.generarDatosReportePdf(
        { codigo_reporte: 'REP_CATEDRAS', formato: 'PDF' },
        1,
      );

      expect(res).toBeDefined();
      expect(res.institucion.universidad).toContain('Gabriel René Moreno');
      expect(res.metadatos.codigo_reporte).toBe('REP_CATEDRAS');
      expect(res.metadatos.hash_sha256).toHaveLength(64);
      expect(res.columnas.length).toBeGreaterThan(0);
      expect(res.filas.length).toBe(1);
      expect(res.resumen.total_registros).toBe(1);

      expect(mockDocRepo.save).toHaveBeenCalled();
      expect(mockAuditoriaService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'EXPORTAR_REPORTE_PDF',
        }),
      );
    });
  });
});
