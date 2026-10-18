import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LaboratorioSala } from '../entities/laboratorio-sala.entity';
import { Computadora } from '../entities/computadora.entity';
import { CrearSalaDto } from '../dto/crear-sala.dto';
import { ActualizarSalaDto } from '../dto/actualizar-sala.dto';
import { AuditoriaService } from '../../auditoria/auditoria.service';

@Injectable()
export class SalasService {
  private readonly logger = new Logger(SalasService.name);

  constructor(
    @InjectRepository(LaboratorioSala)
    private readonly salaRepo: Repository<LaboratorioSala>,
    @InjectRepository(Computadora)
    private readonly computadoraRepo: Repository<Computadora>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async findAll(params?: {
    busqueda?: string;
    piso?: number;
    estado_operativo?: string;
    activo?: boolean;
  }) {
    const qb = this.salaRepo.createQueryBuilder('s');

    if (params?.busqueda && params.busqueda.trim() !== '') {
      const term = `%${params.busqueda.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(s.codigo_sala) LIKE :term OR LOWER(s.nombre) LIKE :term)',
        { term },
      );
    }

    if (params?.piso !== undefined && params.piso !== null && !isNaN(params.piso)) {
      qb.andWhere('s.piso = :piso', { piso: params.piso });
    }

    if (params?.estado_operativo && params.estado_operativo.trim() !== '') {
      qb.andWhere('s.estado_operativo = :estado', {
        estado: params.estado_operativo,
      });
    }

    if (params?.activo !== undefined && params.activo !== null) {
      qb.andWhere('s.activo = :activo', { activo: params.activo });
    }

    qb.orderBy('s.piso', 'ASC').addOrderBy('s.codigo_sala', 'ASC');

    const salas = await qb.getMany();

    // Obtener recuentos de computadoras por sala
    const conteos = await this.computadoraRepo
      .createQueryBuilder('c')
      .select('c.id_sala', 'id_sala')
      .addSelect('COUNT(c.id_computadora)', 'total')
      .addSelect(
        "COUNT(CASE WHEN c.estado_actual = 'DISPONIBLE' THEN 1 END)",
        'disponibles',
      )
      .addSelect(
        "COUNT(CASE WHEN c.estado_actual = 'OCUPADA' THEN 1 END)",
        'ocupadas',
      )
      .addSelect(
        "COUNT(CASE WHEN c.estado_actual = 'EN_MANTENIMIENTO' THEN 1 END)",
        'en_mantenimiento',
      )
      .where('c.activo = true')
      .groupBy('c.id_sala')
      .getRawMany();

    const conteosMap = new Map<number, any>();
    for (const c of conteos) {
      conteosMap.set(Number(c.id_sala), {
        total: parseInt(c.total, 10) || 0,
        disponibles: parseInt(c.disponibles, 10) || 0,
        ocupadas: parseInt(c.ocupadas, 10) || 0,
        en_mantenimiento: parseInt(c.en_mantenimiento, 10) || 0,
      });
    }

    return salas.map((s) => {
      const stats = conteosMap.get(s.id_sala) || {
        total: 0,
        disponibles: 0,
        ocupadas: 0,
        en_mantenimiento: 0,
      };
      return {
        ...s,
        total_equipos: stats.total,
        equipos_disponibles: stats.disponibles,
        equipos_ocupados: stats.ocupadas,
        equipos_en_mantenimiento: stats.en_mantenimiento,
      };
    });
  }

  async findOne(id: number) {
    const sala = await this.salaRepo.findOne({
      where: { id_sala: id },
      relations: {
        computadoras: {
          perifericos: true,
        },
      },
      order: {
        computadoras: {
          posicion_fila: 'ASC',
          posicion_columna: 'ASC',
        },
      },
    });

    if (!sala) {
      throw new NotFoundException(`Sala con ID ${id} no encontrada`);
    }

    return sala;
  }

  async crear(
    dto: CrearSalaDto,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    const codigo_sala = dto.codigo_sala.trim().toUpperCase();
    const existe = await this.salaRepo.findOne({
      where: { codigo_sala },
    });

    if (existe) {
      throw new ConflictException(
        `Ya existe una sala con el código "${codigo_sala}" (${existe.nombre})`,
      );
    }

    const nueva = this.salaRepo.create({
      codigo_sala,
      nombre: dto.nombre.trim(),
      piso: dto.piso,
      cant_estudiantes: dto.cant_estudiantes ?? 24,
      maquina_docente: dto.maquina_docente ?? true,
      proyector: dto.proyector ?? true,
      aire_acondicionado: dto.aire_acondicionado ?? true,
      filas_cuadricula: dto.filas_cuadricula ?? 6,
      columnas_cuadricula: dto.columnas_cuadricula ?? 8,
      estado_operativo: dto.estado_operativo ?? 'OPERATIVA',
      activo: true,
    });

    const guardada = await this.salaRepo.save(nueva);

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo || 'sistema@uagrm.edu.bo',
      accion: 'CREAR',
      tabla_afectada: 'laboratorio_sala',
      id_registro_afectado: String(guardada.id_sala),
      valores_nuevos: guardada,
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[SALAS] Sala creada: ${guardada.codigo_sala} - ${guardada.nombre} (Piso ${guardada.piso}) por ${ejecutor?.correo || 'Sistema'}`,
    );

    return guardada;
  }

  async actualizar(
    id: number,
    dto: ActualizarSalaDto,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    const sala = await this.salaRepo.findOne({
      where: { id_sala: id },
    });

    if (!sala) {
      throw new NotFoundException(`Sala con ID ${id} no encontrada`);
    }

    const valoresAnteriores = { ...sala };

    if (dto.codigo_sala) {
      const nuevoCodigo = dto.codigo_sala.trim().toUpperCase();
      if (nuevoCodigo !== sala.codigo_sala) {
        const existe = await this.salaRepo.findOne({
          where: { codigo_sala: nuevoCodigo },
        });
        if (existe) {
          throw new ConflictException(
            `El código de sala "${nuevoCodigo}" ya está en uso`,
          );
        }
        sala.codigo_sala = nuevoCodigo;
      }
    }

    if (dto.nombre !== undefined) sala.nombre = dto.nombre.trim();
    if (dto.piso !== undefined) sala.piso = dto.piso;
    if (dto.cant_estudiantes !== undefined) sala.cant_estudiantes = dto.cant_estudiantes;
    if (dto.maquina_docente !== undefined) sala.maquina_docente = dto.maquina_docente;
    if (dto.proyector !== undefined) sala.proyector = dto.proyector;
    if (dto.aire_acondicionado !== undefined) sala.aire_acondicionado = dto.aire_acondicionado;
    if (dto.filas_cuadricula !== undefined) sala.filas_cuadricula = dto.filas_cuadricula;
    if (dto.columnas_cuadricula !== undefined) sala.columnas_cuadricula = dto.columnas_cuadricula;
    if (dto.estado_operativo !== undefined) sala.estado_operativo = dto.estado_operativo;
    if (dto.activo !== undefined) sala.activo = dto.activo;

    const actualizada = await this.salaRepo.save(sala);

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo || 'sistema@uagrm.edu.bo',
      accion: 'ACTUALIZAR',
      tabla_afectada: 'laboratorio_sala',
      id_registro_afectado: String(actualizada.id_sala),
      valores_anteriores: valoresAnteriores,
      valores_nuevos: actualizada,
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[SALAS] Sala ${actualizada.codigo_sala} actualizada por ${ejecutor?.correo || 'Sistema'}`,
    );

    return actualizada;
  }

  async eliminar(
    id: number,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    const sala = await this.salaRepo.findOne({
      where: { id_sala: id },
    });

    if (!sala) {
      throw new NotFoundException(`Sala con ID ${id} no encontrada`);
    }

    const valoresAnteriores = { ...sala };
    if (sala.activo) {
      sala.activo = false;
      sala.estado_operativo = 'CERRADA';
    } else {
      sala.activo = true;
      sala.estado_operativo = 'OPERATIVA';
    }
    const guardada = await this.salaRepo.save(sala);

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo || 'sistema@uagrm.edu.bo',
      accion: guardada.activo ? 'RESTAURAR' : 'DESACTIVAR',
      tabla_afectada: 'laboratorio_sala',
      id_registro_afectado: String(guardada.id_sala),
      valores_anteriores: valoresAnteriores,
      valores_nuevos: guardada,
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[SALAS] Sala ${guardada.codigo_sala} ${guardada.activo ? 'reactivada' : 'desactivada'} por ${ejecutor?.correo || 'Sistema'}`,
    );

    return guardada;
  }
}
