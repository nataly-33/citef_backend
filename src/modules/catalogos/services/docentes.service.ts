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
import * as bcrypt from 'bcryptjs';
import { Docente } from '../entities/docente.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Rol } from '../../usuarios/entities/rol.entity';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { CrearDocenteDto } from '../dto/crear-docente.dto';
import { ActualizarDocenteDto } from '../dto/actualizar-docente.dto';

export const PASSWORD_GENERICA_DOCENTES = 'Docente.CITEF2026*';

@Injectable()
export class DocentesService {
  private readonly logger = new Logger(DocentesService.name);

  constructor(
    @InjectRepository(Docente)
    private readonly docenteRepo: Repository<Docente>,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Rol)
    private readonly rolRepo: Repository<Rol>,
    private readonly auditoriaService: AuditoriaService,
    private readonly dataSource: DataSource,
  ) {}

  private mapDocente(d: any) {
    return {
      codigo: d.codigo,
      id_usuario: d.id_usuario,
      nombres: d.usuario?.nombres || '',
      apellidos: d.usuario?.apellidos || '',
      correo: d.usuario?.correo_institucional || '',
      telefono: d.usuario?.telefono || null,
      departamento_academico: d.departamento_academico || 'General',
      condicion_contrato: d.condicion_contrato || 'TITULAR',
      activo: d.activo && (d.usuario ? d.usuario.activo : true),
      creado_en: d.creado_en,
      actualizado_en: d.actualizado_en,
    };
  }

  async findAll(params?: {
    pagina?: number;
    limite?: number;
    busqueda?: string;
    activo?: boolean;
    todos?: boolean;
  }) {
    const qb = this.docenteRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.usuario', 'u')
      .orderBy('d.codigo', 'ASC');

    if (params?.activo !== undefined) {
      qb.andWhere('d.activo = :activo', { activo: params.activo });
    }

    if (params?.busqueda) {
      qb.andWhere(
        '(d.codigo ILIKE :q OR u.nombres ILIKE :q OR u.apellidos ILIKE :q OR u.correo_institucional ILIKE :q OR d.departamento_academico ILIKE :q)',
        { q: `%${params.busqueda}%` },
      );
    }

    if (params?.todos) {
      const items = await qb.getMany();
      return items.map((d) => this.mapDocente(d));
    }

    const limite = params?.limite || 15;
    const pagina = params?.pagina || 1;
    const skip = (pagina - 1) * limite;

    qb.take(limite).skip(skip);

    const [items, total] = await qb.getManyAndCount();

    return {
      total,
      pagina,
      limite,
      paginas_totales: Math.ceil(total / limite),
      password_generica: PASSWORD_GENERICA_DOCENTES,
      items: items.map((d) => this.mapDocente(d)),
    };
  }

  async findOne(codigo: string) {
    const docente = await this.docenteRepo.findOne({
      where: { codigo: codigo.trim().toUpperCase() },
      relations: { usuario: true },
    });

    if (!docente) {
      throw new NotFoundException(
        `Docente con código "${codigo}" no encontrado`,
      );
    }

    return this.mapDocente(docente);
  }

  async crear(
    dto: CrearDocenteDto,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    const codigo = dto.codigo.trim().toUpperCase();
    const correo = dto.correo.trim().toLowerCase();

    const existeDocente = await this.docenteRepo.findOne({ where: { codigo } });
    if (existeDocente) {
      throw new ConflictException(
        `Ya existe un docente registrado con el código "${codigo}"`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let docenteGuardado: Docente;

    try {
      const rolDocente = await queryRunner.manager.findOne(Rol, {
        where: { nombre: 'DOCENTE' },
      });

      let usuario = await queryRunner.manager.findOne(Usuario, {
        where: { correo_institucional: correo },
        relations: { roles: true },
      });

      if (usuario) {
        const docenteExistente = await queryRunner.manager.findOne(Docente, {
          where: { id_usuario: usuario.id_usuario },
        });
        if (docenteExistente) {
          throw new ConflictException(
            `El usuario con correo "${correo}" ya está registrado como docente con código "${docenteExistente.codigo}"`,
          );
        }
        // Asignar rol docente si no lo tenía
        if (rolDocente && !usuario.roles.some((r) => r.nombre === 'DOCENTE')) {
          usuario.roles.push(rolDocente);
          await queryRunner.manager.save(usuario);
        }
      } else {
        const passwordHash = await bcrypt.hash(PASSWORD_GENERICA_DOCENTES, 10);
        usuario = queryRunner.manager.create(Usuario, {
          correo_institucional: correo,
          password_hash: passwordHash,
          nombres: dto.nombres.trim(),
          apellidos: dto.apellidos.trim(),
          telefono: dto.telefono ? dto.telefono.trim() : (null as any),
          activo: dto.activo !== undefined ? dto.activo : true,
          roles: rolDocente ? [rolDocente] : [],
        });
        usuario = await queryRunner.manager.save(usuario);
      }

      const nuevoDocente = queryRunner.manager.create(Docente, {
        codigo,
        id_usuario: usuario.id_usuario,
        departamento_academico: dto.departamento_academico?.trim() || 'General',
        condicion_contrato: dto.condicion_contrato?.trim() || 'TITULAR',
        activo: dto.activo !== undefined ? dto.activo : true,
      });

      docenteGuardado = await queryRunner.manager.save(nuevoDocente);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo,
      accion: 'INSERT',
      tabla_afectada: 'docente',
      id_registro_afectado: docenteGuardado.codigo,
      valores_nuevos: {
        codigo: docenteGuardado.codigo,
        id_usuario: docenteGuardado.id_usuario,
        correo,
        nombres: dto.nombres,
        apellidos: dto.apellidos,
        departamento: docenteGuardado.departamento_academico,
        condicion: docenteGuardado.condicion_contrato,
      },
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[DOCENTES] Docente y Usuario creados: ${docenteGuardado.codigo} (${correo}) por ${ejecutor?.correo || 'Sistema'}`,
    );

    return this.findOne(docenteGuardado.codigo);
  }

  async actualizar(
    codigo: string,
    dto: ActualizarDocenteDto,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    const codUpper = codigo.trim().toUpperCase();
    const docente = await this.docenteRepo.findOne({
      where: { codigo: codUpper },
      relations: { usuario: true },
    });

    if (!docente) {
      throw new NotFoundException(
        `Docente con código "${codigo}" no encontrado`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const usuario = docente.usuario;
      if (usuario) {
        if (dto.correo) {
          const correoNuevo = dto.correo.trim().toLowerCase();
          if (correoNuevo !== usuario.correo_institucional) {
            const correoDuplicado = await queryRunner.manager.findOne(Usuario, {
              where: { correo_institucional: correoNuevo },
            });
            if (
              correoDuplicado &&
              correoDuplicado.id_usuario !== usuario.id_usuario
            ) {
              throw new ConflictException(
                `El correo ${correoNuevo} ya está en uso por otro usuario`,
              );
            }
            usuario.correo_institucional = correoNuevo;
          }
        }

        if (dto.nombres !== undefined) usuario.nombres = dto.nombres.trim();
        if (dto.apellidos !== undefined)
          usuario.apellidos = dto.apellidos.trim();
        if (dto.telefono !== undefined) {
          usuario.telefono = dto.telefono ? dto.telefono.trim() : null;
        }
        if (dto.activo !== undefined) usuario.activo = dto.activo;

        await queryRunner.manager.save(usuario);
      }

      if (dto.departamento_academico !== undefined) {
        docente.departamento_academico = dto.departamento_academico.trim();
      }
      if (dto.condicion_contrato !== undefined) {
        docente.condicion_contrato = dto.condicion_contrato.trim();
      }
      if (dto.activo !== undefined) {
        docente.activo = dto.activo;
      }

      await queryRunner.manager.save(docente);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo,
      accion: 'UPDATE',
      tabla_afectada: 'docente',
      id_registro_afectado: docente.codigo,
      valores_nuevos: {
        codigo: docente.codigo,
        nombres: dto.nombres,
        apellidos: dto.apellidos,
        correo: dto.correo,
        departamento: docente.departamento_academico,
        condicion: docente.condicion_contrato,
        activo: docente.activo,
      },
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[DOCENTES] Docente y Usuario actualizados: ${docente.codigo} por ${ejecutor?.correo || 'Sistema'}`,
    );

    return this.findOne(docente.codigo);
  }

  async cambiarEstado(
    codigo: string,
    activo: boolean,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    const codUpper = codigo.trim().toUpperCase();
    const docente = await this.docenteRepo.findOne({
      where: { codigo: codUpper },
      relations: { usuario: true },
    });

    if (!docente) {
      throw new NotFoundException(
        `Docente con código "${codigo}" no encontrado`,
      );
    }

    docente.activo = activo;
    if (docente.usuario) {
      docente.usuario.activo = activo;
      await this.usuarioRepo.save(docente.usuario);
    }
    await this.docenteRepo.save(docente);

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo,
      accion: 'CAMBIO_ESTADO',
      tabla_afectada: 'docente',
      id_registro_afectado: docente.codigo,
      valores_anteriores: { activo: !activo },
      valores_nuevos: { activo },
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[DOCENTES] Docente ${docente.codigo} estado modificado a ${activo ? 'ACTIVO' : 'INACTIVO'} por ${ejecutor?.correo || 'Sistema'}`,
    );

    return this.findOne(docente.codigo);
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
      [
        'codigo',
        'nombres',
        'apellidos',
        'correo',
        'telefono',
        'departamento',
        'condicion',
      ],
      [
        'DOC-1001',
        'Carlos Alberto',
        'Martinez Soliz',
        'carlos.martinez@uagrm.edu.bo',
        '77012345',
        'Administración',
        'TITULAR',
      ],
      [
        'DOC-1002',
        'Maria Elena',
        'Suarez Gomez',
        'elena.suarez@uagrm.edu.bo',
        '77098765',
        'Economía',
        'INVITADO',
      ],
      [
        'DOC-1003',
        'Juan Pablo',
        'Roca Fernandez',
        'jp.roca@uagrm.edu.bo',
        '71055566',
        'Finanzas',
        'TITULAR',
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Padrón Docente');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  obtenerEstructuraPlantilla() {
    return {
      columnas_requeridas: ['codigo', 'nombres', 'apellidos', 'correo'],
      columnas_opcionales: ['telefono', 'departamento', 'condicion'],
      password_generica_asignada: PASSWORD_GENERICA_DOCENTES,
      formatos_permitidos: ['.xlsx', '.xls', '.csv'],
      ejemplo: [
        {
          codigo: 'DOC-1001',
          nombres: 'Carlos Alberto',
          apellidos: 'Martinez Soliz',
          correo: 'carlos.martinez@uagrm.edu.bo',
          telefono: '77012345',
          departamento: 'Administración',
          condicion: 'TITULAR',
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
    let rows: any[][] = [];
    const isCsv = fileName.toLowerCase().endsWith('.csv');

    try {
      if (isCsv) {
        const textContent = fileBuffer.toString('utf-8');
        const firstLine =
          textContent.split(/\r?\n/).find((l) => l.trim().length > 0) || '';
        const semicolonCount = (firstLine.match(/;/g) || []).length;
        const commaCount = (firstLine.match(/,/g) || []).length;
        const delimiter = semicolonCount > commaCount ? ';' : ',';

        try {
          workbook = XLSX.read(textContent, {
            type: 'string',
            FS: delimiter,
            raw: true,
          });
        } catch {
          workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        }
      } else {
        workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      }
    } catch {
      throw new BadRequestException(
        'No se pudo procesar el archivo. Asegúrese de que sea un libro de Excel (.xlsx, .xls) o archivo .csv válido',
      );
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new BadRequestException(
        'El archivo no contiene ninguna hoja con datos',
      );
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });

    // Descomponer si la fila quedó en una sola celda delimitada
    if (
      rows &&
      rows.length > 0 &&
      rows[0].length === 1 &&
      typeof rows[0][0] === 'string'
    ) {
      const sep = rows[0][0].includes(';')
        ? ';'
        : rows[0][0].includes(',')
          ? ','
          : null;
      if (sep) {
        rows = rows.map((r) =>
          typeof r[0] === 'string' ? r[0].split(sep) : r,
        );
      }
    }

    if (!rows || rows.length < 2) {
      throw new BadRequestException(
        'El archivo debe contener la fila de encabezados y al menos un registro de docente',
      );
    }

    // 1. Validar encabezados en la fila 1 (con soporte a variaciones de acentos y formatos)
    const rawHeaders = rows[0].map((h) =>
      String(h || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\s_-]+/g, ''),
    );

    const findHeaderCol = (aliases: string[]): number => {
      return rawHeaders.findIndex((h) =>
        aliases.some((alias) => h === alias || h.includes(alias)),
      );
    };

    const colCodigo = findHeaderCol(['codigo', 'cod', 'coddocente', 'ci']);
    const colNombres = findHeaderCol(['nombres', 'nombre']);
    const colApellidos = findHeaderCol(['apellidos', 'apellido']);
    const colCorreo = findHeaderCol(['correo', 'email', 'correoinstitucional']);
    const colTelefono = findHeaderCol(['telefono', 'celular', 'telf']);
    const colDepartamento = findHeaderCol([
      'departamento',
      'depto',
      'departamentoacademico',
    ]);
    const colCondicion = findHeaderCol([
      'condicion',
      'contrato',
      'condicioncontrato',
    ]);

    if (
      colCodigo === -1 ||
      colNombres === -1 ||
      colApellidos === -1 ||
      colCorreo === -1
    ) {
      throw new BadRequestException(
        'Encabezados requeridos faltantes. El archivo debe incluir obligatoriamente: "codigo", "nombres", "apellidos", "correo"',
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const codigosEnArchivo = new Set<string>();
    const correosEnArchivo = new Set<string>();
    const docentesAInsertar: Array<{
      codigo: string;
      nombres: string;
      apellidos: string;
      correo: string;
      telefono: string | null;
      departamento: string;
      condicion: string;
      fila: number;
    }> = [];

    // 2. Validación fila por fila previa
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const excelRow = i + 1;

      if (
        !row ||
        row.every(
          (c) => c === null || c === undefined || String(c).trim() === '',
        )
      ) {
        continue;
      }

      const codigo = String(row[colCodigo] ?? '')
        .trim()
        .toUpperCase();
      const nombres = String(row[colNombres] ?? '').trim();
      const apellidos = String(row[colApellidos] ?? '').trim();
      const correo = String(row[colCorreo] ?? '')
        .trim()
        .toLowerCase();
      const telefono =
        colTelefono !== -1 && row[colTelefono]
          ? String(row[colTelefono]).trim()
          : null;
      const departamento =
        colDepartamento !== -1 && row[colDepartamento]
          ? String(row[colDepartamento]).trim()
          : 'General';
      const condicion =
        colCondicion !== -1 && row[colCondicion]
          ? String(row[colCondicion]).trim().toUpperCase()
          : 'TITULAR';

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

      if (correosEnArchivo.has(correo)) {
        throw new BadRequestException(
          `Error en la fila ${excelRow}: El correo electrónico "${correo}" se encuentra repetido en el mismo archivo (código "${codigo}")`,
        );
      }

      codigosEnArchivo.add(codigo);
      correosEnArchivo.add(correo);

      docentesAInsertar.push({
        codigo,
        nombres,
        apellidos,
        correo,
        telefono,
        departamento,
        condicion,
        fila: excelRow,
      });
    }

    if (docentesAInsertar.length === 0) {
      throw new BadRequestException(
        'No se encontraron filas con datos de docentes para importar',
      );
    }

    // 3. Transacción atómica
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const passwordHashDocente = await bcrypt.hash(
      PASSWORD_GENERICA_DOCENTES,
      10,
    );

    try {
      const rolDocente = await queryRunner.manager.findOne(Rol, {
        where: { nombre: 'DOCENTE' },
      });

      for (const d of docentesAInsertar) {
        const existeEnDb = await queryRunner.manager.findOne(Docente, {
          where: { codigo: d.codigo },
        });

        if (existeEnDb) {
          throw new ConflictException(
            `Error en la fila ${d.fila}: El código docente "${d.codigo}" ya se encuentra registrado en el sistema`,
          );
        }

        // Buscar o crear usuario
        let usuario = await queryRunner.manager.findOne(Usuario, {
          where: { correo_institucional: d.correo },
          relations: { roles: true },
        });

        if (usuario) {
          // Verificar si este usuario ya está vinculado a otro docente
          const docenteExistente = await queryRunner.manager.findOne(Docente, {
            where: { id_usuario: usuario.id_usuario },
          });

          if (docenteExistente) {
            throw new ConflictException(
              `Error en la fila ${d.fila}: El correo "${d.correo}" ya se encuentra asignado al docente con código "${docenteExistente.codigo}"`,
            );
          }

          // Asignar rol docente si no lo tenía
          if (
            rolDocente &&
            !usuario.roles.some((r) => r.nombre === 'DOCENTE')
          ) {
            usuario.roles.push(rolDocente);
            await queryRunner.manager.save(usuario);
          }
        } else {
          usuario = queryRunner.manager.create(Usuario, {
            correo_institucional: d.correo,
            password_hash: passwordHashDocente,
            nombres: d.nombres,
            apellidos: d.apellidos,
            telefono: d.telefono || (null as any),
            activo: true,
            roles: rolDocente ? [rolDocente] : [],
          });
          usuario = await queryRunner.manager.save(usuario);
        }

        const nuevoDocente = queryRunner.manager.create(Docente, {
          codigo: d.codigo,
          id_usuario: usuario.id_usuario,
          departamento_academico: d.departamento,
          condicion_contrato: d.condicion,
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
      if (
        err instanceof BadRequestException ||
        err instanceof ConflictException
      ) {
        throw err;
      }
      if (err.code === '23505') {
        throw new ConflictException(
          `Conflicto de unicidad en la base de datos al importar "${fileName}": registro duplicado detectado. Detalle: ${err.detail || err.message}`,
        );
      }
      throw new BadRequestException(
        `Error al importar archivo "${fileName}": ${err.message}`,
      );
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
        password_generica_asignada: PASSWORD_GENERICA_DOCENTES,
      },
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[DOCENTES] Importación masiva completada: ${docentesAInsertar.length} docentes y cuentas creadas desde "${fileName}" por ${ejecutor?.correo || 'Sistema'}`,
    );

    return {
      exito: true,
      mensaje: `Padrón docente importado exitosamente. Se registraron ${docentesAInsertar.length} docentes con sus cuentas de usuario (Contraseña inicial: ${PASSWORD_GENERICA_DOCENTES}).`,
      total_importados: docentesAInsertar.length,
      password_generica: PASSWORD_GENERICA_DOCENTES,
      docentes: docentesAInsertar.map((d) => ({
        codigo: d.codigo,
        nombres: d.nombres,
        apellidos: d.apellidos,
        correo: d.correo,
      })),
    };
  }
}
