import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as XLSX from 'xlsx';
import { Docente } from '../entities/docente.entity';
import { CrearDocenteDto } from '../dto/crear-docente.dto';
import { ActualizarDocenteDto } from '../dto/actualizar-docente.dto';
import { AuditoriaService } from '../../auditoria/auditoria.service';

@Injectable()
export class DocentesService {
  private readonly logger = new Logger(DocentesService.name);

  constructor(
    @InjectRepository(Docente)
    private readonly docenteRepo: Repository<Docente>,
    private readonly dataSource: DataSource,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async findAll(params?: {
    pagina?: number;
    limite?: number;
    busqueda?: string;
    activo?: boolean;
    todos?: boolean;
  }) {
    if (params?.todos) {
      const qb = this.docenteRepo
        .createQueryBuilder('d')
        .orderBy('d.apellidos', 'ASC')
        .addOrderBy('d.nombres', 'ASC');

      if (params.activo !== undefined) {
        qb.andWhere('d.activo = :activo', { activo: params.activo });
      }

      if (params.busqueda) {
        qb.andWhere(
          '(d.codigo ILIKE :q OR d.nombres ILIKE :q OR d.apellidos ILIKE :q OR d.correo ILIKE :q)',
          { q: `%${params.busqueda}%` },
        );
      }

      return qb.getMany();
    }

    const limite = params?.limite || 15;
    const pagina = params?.pagina || 1;
    const skip = (pagina - 1) * limite;

    const qb = this.docenteRepo
      .createQueryBuilder('d')
      .orderBy('d.apellidos', 'ASC')
      .addOrderBy('d.nombres', 'ASC')
      .take(limite)
      .skip(skip);

    if (params?.activo !== undefined) {
      qb.andWhere('d.activo = :activo', { activo: params.activo });
    }

    if (params?.busqueda) {
      qb.andWhere(
        '(d.codigo ILIKE :q OR d.nombres ILIKE :q OR d.apellidos ILIKE :q OR d.correo ILIKE :q)',
        { q: `%${params.busqueda}%` },
      );
    }

    const [items, total] = await qb.getManyAndCount();

    return {
      total,
      pagina,
      limite,
      paginas_totales: Math.ceil(total / limite),
      items,
    };
  }

  async findOne(codigo: string) {
    const docente = await this.docenteRepo.findOne({
      where: { codigo: codigo.trim() },
    });

    if (!docente) {
      throw new NotFoundException(
        `Docente con código "${codigo}" no encontrado`,
      );
    }

    return docente;
  }

  async crear(
    dto: CrearDocenteDto,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    const codigo = dto.codigo.trim();
    const existe = await this.docenteRepo.findOne({
      where: { codigo },
    });

    if (existe) {
      throw new ConflictException(
        `Ya existe un docente registrado con el código "${codigo}"`,
      );
    }

    const nuevo = this.docenteRepo.create({
      codigo,
      nombres: dto.nombres.trim(),
      apellidos: dto.apellidos.trim(),
      correo: dto.correo.trim().toLowerCase(),
      telefono: dto.telefono ? dto.telefono.trim() : null,
      activo: dto.activo !== undefined ? dto.activo : true,
    });

    const guardado = await this.docenteRepo.save(nuevo);

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo,
      accion: 'INSERT',
      tabla_afectada: 'docente',
      id_registro_afectado: guardado.codigo,
      valores_nuevos: {
        codigo: guardado.codigo,
        nombres: guardado.nombres,
        apellidos: guardado.apellidos,
        correo: guardado.correo,
        telefono: guardado.telefono,
        activo: guardado.activo,
      },
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[DOCENTES] Docente creado: ${guardado.codigo} (${guardado.nombres} ${guardado.apellidos}) por ${ejecutor?.correo || 'Sistema'}`,
    );

    return guardado;
  }

  async actualizar(
    codigo: string,
    dto: ActualizarDocenteDto,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    const docente = await this.findOne(codigo);

    const valoresAnteriores = {
      nombres: docente.nombres,
      apellidos: docente.apellidos,
      correo: docente.correo,
      telefono: docente.telefono,
      activo: docente.activo,
    };

    if (dto.nombres !== undefined) docente.nombres = dto.nombres.trim();
    if (dto.apellidos !== undefined) docente.apellidos = dto.apellidos.trim();
    if (dto.correo !== undefined) docente.correo = dto.correo.trim().toLowerCase();
    if (dto.telefono !== undefined) {
      docente.telefono = dto.telefono ? dto.telefono.trim() : null;
    }
    if (dto.activo !== undefined) docente.activo = dto.activo;

    const actualizado = await this.docenteRepo.save(docente);

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo,
      accion: 'UPDATE',
      tabla_afectada: 'docente',
      id_registro_afectado: actualizado.codigo,
      valores_anteriores: valoresAnteriores,
      valores_nuevos: {
        nombres: actualizado.nombres,
        apellidos: actualizado.apellidos,
        correo: actualizado.correo,
        telefono: actualizado.telefono,
        activo: actualizado.activo,
      },
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[DOCENTES] Docente actualizado: ${actualizado.codigo} por ${ejecutor?.correo || 'Sistema'}`,
    );

    return actualizado;
  }

  async cambiarEstado(
    codigo: string,
    activo: boolean,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    const docente = await this.findOne(codigo);
    const estadoAnterior = docente.activo;
    docente.activo = activo;
    const guardado = await this.docenteRepo.save(docente);

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo,
      accion: 'CAMBIO_ESTADO',
      tabla_afectada: 'docente',
      id_registro_afectado: guardado.codigo,
      valores_anteriores: { activo: estadoAnterior },
      valores_nuevos: { activo: guardado.activo },
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[DOCENTES] Docente ${guardado.codigo} estado modificado a ${activo ? 'ACTIVO' : 'INACTIVO'} por ${ejecutor?.correo || 'Sistema'}`,
    );

    return guardado;
  }

  async eliminar(
    codigo: string,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    return this.cambiarEstado(codigo, false, ejecutor, ipCliente);
  }

  generarPlantillaExcel(): Buffer {
    const wb = XLSX.utils.book_new();
    const data = [
      ['codigo', 'nombres', 'apellidos', 'correo', 'telefono'],
      [
        'DOC-1001',
        'Carlos Alberto',
        'Martinez Soliz',
        'carlos.martinez@uagrm.edu.bo',
        '77012345',
      ],
      [
        'DOC-1002',
        'Maria Elena',
        'Suarez Gomez',
        'elena.suarez@uagrm.edu.bo',
        '77098765',
      ],
      [
        'DOC-1003',
        'Juan Pablo',
        'Roca Fernandez',
        'jp.roca@uagrm.edu.bo',
        '71055566',
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Padrón Docente');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  obtenerEstructuraPlantilla() {
    return {
      columnas_requeridas: ['codigo', 'nombres', 'apellidos', 'correo'],
      columnas_opcionales: ['telefono'],
      formatos_permitidos: ['.xlsx', '.xls', '.csv'],
      ejemplo: [
        {
          codigo: 'DOC-1001',
          nombres: 'Carlos Alberto',
          apellidos: 'Martinez Soliz',
          correo: 'carlos.martinez@uagrm.edu.bo',
          telefono: '77012345',
        },
        {
          codigo: 'DOC-1002',
          nombres: 'Maria Elena',
          apellidos: 'Suarez Gomez',
          correo: 'elena.suarez@uagrm.edu.bo',
          telefono: '77098765',
        },
      ],
    };
  }

  async importarExcel(
    fileBuffer: Buffer,
    fileName: string,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new BadRequestException('El archivo subido se encuentra vacío');
    }

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    } catch {
      throw new BadRequestException(
        'No se pudo procesar el archivo. Asegúrese de que sea un libro de Excel (.xlsx, .xls) o archivo .csv válido',
      );
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new BadRequestException('El libro de cálculo no contiene ninguna hoja');
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });

    if (!rows || rows.length < 2) {
      throw new BadRequestException(
        'El archivo debe contener la fila de encabezados y al menos un registro de docente',
      );
    }

    // 1. Validar encabezados en la fila 1
    const rawHeaders = rows[0].map((h) =>
      String(h || '').trim().toLowerCase(),
    );
    const colCodigo = rawHeaders.indexOf('codigo');
    const colNombres = rawHeaders.indexOf('nombres');
    const colApellidos = rawHeaders.indexOf('apellidos');
    const colCorreo = rawHeaders.indexOf('correo');
    const colTelefono = rawHeaders.indexOf('telefono');

    if (
      colCodigo === -1 ||
      colNombres === -1 ||
      colApellidos === -1 ||
      colCorreo === -1
    ) {
      throw new BadRequestException(
        'Encabezados requeridos faltantes. El archivo debe incluir: "codigo", "nombres", "apellidos", "correo"',
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const codigosEnArchivo = new Set<string>();
    const docentesAInsertar: Array<{
      codigo: string;
      nombres: string;
      apellidos: string;
      correo: string;
      telefono: string | null;
      fila: number;
    }> = [];

    // 2. Validación fila por fila previa
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const excelRow = i + 1; // 1-indexed

      // Ignorar filas totalmente vacías
      if (
        !row ||
        row.every((c) => c === null || c === undefined || String(c).trim() === '')
      ) {
        continue;
      }

      const codigo = String(row[colCodigo] ?? '').trim();
      const nombres = String(row[colNombres] ?? '').trim();
      const apellidos = String(row[colApellidos] ?? '').trim();
      const correo = String(row[colCorreo] ?? '').trim().toLowerCase();
      const telefono =
        colTelefono !== -1 && row[colTelefono]
          ? String(row[colTelefono]).trim()
          : null;

      if (!codigo) {
        throw new BadRequestException(
          `Error en la fila ${excelRow}: El código de docente es obligatorio`,
        );
      }

      if (!nombres) {
        throw new BadRequestException(
          `Error en la fila ${excelRow}: El nombre del docente es obligatorio`,
        );
      }

      if (!apellidos) {
        throw new BadRequestException(
          `Error en la fila ${excelRow}: El apellido del docente es obligatorio`,
        );
      }

      if (!correo) {
        throw new BadRequestException(
          `Error en la fila ${excelRow}: El correo electrónico es obligatorio`,
        );
      }

      if (!emailRegex.test(correo)) {
        throw new BadRequestException(
          `Error en la fila ${excelRow}: El correo electrónico "${correo}" no tiene un formato válido`,
        );
      }

      if (codigosEnArchivo.has(codigo)) {
        throw new BadRequestException(
          `Error en la fila ${excelRow}: El código docente "${codigo}" se encuentra duplicado en el mismo archivo`,
        );
      }
      codigosEnArchivo.add(codigo);

      docentesAInsertar.push({
        codigo,
        nombres,
        apellidos,
        correo,
        telefono,
        fila: excelRow,
      });
    }

    if (docentesAInsertar.length === 0) {
      throw new BadRequestException(
        'No se encontraron filas con datos de docentes para importar',
      );
    }

    // 3. Transacción atómica con QueryRunner
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const d of docentesAInsertar) {
        const existeEnDb = await queryRunner.manager.findOne(Docente, {
          where: { codigo: d.codigo },
        });

        if (existeEnDb) {
          throw new ConflictException(
            `Error en la fila ${d.fila}: El código docente "${d.codigo}" ya se encuentra registrado en el sistema (${existeEnDb.nombres} ${existeEnDb.apellidos})`,
          );
        }

        const nuevoDocente = queryRunner.manager.create(Docente, {
          codigo: d.codigo,
          nombres: d.nombres,
          apellidos: d.apellidos,
          correo: d.correo,
          telefono: d.telefono,
          activo: true,
        });

        await queryRunner.manager.save(nuevoDocente);
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `[DOCENTES] Transacción abortada durante la importación del archivo "${fileName}": ${err.message}`,
      );
      throw err;
    } finally {
      await queryRunner.release();
    }

    // 4. Registro en Auditoría
    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo,
      accion: 'IMPORT_DOCENTES',
      tabla_afectada: 'docente',
      id_registro_afectado: `LOTE-${docentesAInsertar.length}`,
      valores_nuevos: {
        archivo: fileName,
        total_importados: docentesAInsertar.length,
        codigos: docentesAInsertar.map((d) => d.codigo),
      },
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[DOCENTES] Importación masiva completada: ${docentesAInsertar.length} docentes importados desde "${fileName}" por ${ejecutor?.correo || 'Sistema'}`,
    );

    return {
      exito: true,
      mensaje: `Padrón docente importado exitosamente. Se registraron ${docentesAInsertar.length} docentes.`,
      total_importados: docentesAInsertar.length,
      docentes: docentesAInsertar.map((d) => ({
        codigo: d.codigo,
        nombres: d.nombres,
        apellidos: d.apellidos,
        correo: d.correo,
      })),
    };
  }
}
