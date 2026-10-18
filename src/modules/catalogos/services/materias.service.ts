import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Materia } from '../entities/materia.entity';
import { Carrera } from '../entities/carrera.entity';
import { CrearMateriaDto } from '../dto/crear-materia.dto';
import { ActualizarMateriaDto } from '../dto/actualizar-materia.dto';
import { AuditoriaService } from '../../auditoria/auditoria.service';

@Injectable()
export class MateriasService {
  private readonly logger = new Logger(MateriasService.name);

  constructor(
    @InjectRepository(Materia)
    private readonly materiaRepo: Repository<Materia>,
    @InjectRepository(Carrera)
    private readonly carreraRepo: Repository<Carrera>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async findAll(params?: {
    pagina?: number;
    limite?: number;
    id_carrera?: number;
    semestre?: number;
    busqueda?: string;
    activo?: boolean;
    todos?: boolean;
  }) {
    if (params?.todos) {
      const qb = this.materiaRepo
        .createQueryBuilder('m')
        .leftJoinAndSelect('m.carrera', 'c')
        .orderBy('m.semestre_nivel', 'ASC')
        .addOrderBy('m.sigla', 'ASC');

      if (params.id_carrera) {
        qb.andWhere('m.id_carrera = :id_carrera', {
          id_carrera: params.id_carrera,
        });
      }

      if (params.semestre) {
        qb.andWhere('m.semestre_nivel = :semestre', {
          semestre: params.semestre,
        });
      }

      if (params.activo !== undefined) {
        qb.andWhere('m.activo = :activo', { activo: params.activo });
      }

      if (params.busqueda) {
        qb.andWhere(
          '(m.sigla ILIKE :q OR m.nombre ILIKE :q)',
          { q: `%${params.busqueda}%` },
        );
      }

      return qb.getMany();
    }

    const limite = params?.limite || 15;
    const pagina = params?.pagina || 1;
    const skip = (pagina - 1) * limite;

    const qb = this.materiaRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.carrera', 'c')
      .orderBy('m.semestre_nivel', 'ASC')
      .addOrderBy('m.sigla', 'ASC')
      .take(limite)
      .skip(skip);

    if (params?.id_carrera) {
      qb.andWhere('m.id_carrera = :id_carrera', {
        id_carrera: params.id_carrera,
      });
    }

    if (params?.semestre) {
      qb.andWhere('m.semestre_nivel = :semestre', {
        semestre: params.semestre,
      });
    }

    if (params?.activo !== undefined) {
      qb.andWhere('m.activo = :activo', { activo: params.activo });
    }

    if (params?.busqueda) {
      qb.andWhere(
        '(m.sigla ILIKE :q OR m.nombre ILIKE :q)',
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

  async findOne(id: number) {
    const materia = await this.materiaRepo.findOne({
      where: { id_materia: id },
      relations: { carrera: true },
    });

    if (!materia) {
      throw new NotFoundException(`Materia con ID ${id} no encontrada`);
    }

    return materia;
  }

  async crear(
    dto: CrearMateriaDto,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    const sigla = dto.sigla.trim().toUpperCase();
    const nombre = dto.nombre.trim();

    const carrera = await this.carreraRepo.findOne({
      where: { id_carrera: dto.id_carrera },
    });

    if (!carrera) {
      throw new NotFoundException(
        `La carrera con ID ${dto.id_carrera} no existe`,
      );
    }

    const existe = await this.materiaRepo.findOne({
      where: {
        sigla,
        id_carrera: dto.id_carrera,
      },
    });

    if (existe) {
      throw new ConflictException(
        `Ya existe una materia con la sigla ${sigla} en la carrera ${carrera.nombre}`,
      );
    }

    const nuevaMateria = this.materiaRepo.create({
      sigla,
      nombre,
      semestre_nivel: dto.semestre_nivel,
      id_carrera: dto.id_carrera,
      activo: dto.activo !== undefined ? dto.activo : true,
    });

    const guardada = await this.materiaRepo.save(nuevaMateria);

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo,
      accion: 'INSERT',
      tabla_afectada: 'materia',
      id_registro_afectado: String(guardada.id_materia),
      valores_nuevos: {
        sigla: guardada.sigla,
        nombre: guardada.nombre,
        semestre_nivel: guardada.semestre_nivel,
        id_carrera: guardada.id_carrera,
        carrera: carrera.nombre,
        activo: guardada.activo,
      },
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[MATERIAS] Materia creada: ID ${guardada.id_materia} (${guardada.sigla} - ${guardada.nombre}) en Carrera ${carrera.codigo} por ${ejecutor?.correo || 'Sistema'}`,
    );

    return this.findOne(guardada.id_materia);
  }

  async actualizar(
    id: number,
    dto: ActualizarMateriaDto,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    const materia = await this.findOne(id);

    const valoresAnteriores = {
      sigla: materia.sigla,
      nombre: materia.nombre,
      semestre_nivel: materia.semestre_nivel,
      id_carrera: materia.id_carrera,
      activo: materia.activo,
    };

    const targetCarreraId = dto.id_carrera ?? materia.id_carrera;
    const targetSigla = dto.sigla ? dto.sigla.trim().toUpperCase() : materia.sigla;

    if (dto.id_carrera && dto.id_carrera !== materia.id_carrera) {
      const carreraExiste = await this.carreraRepo.findOne({
        where: { id_carrera: dto.id_carrera },
      });
      if (!carreraExiste) {
        throw new NotFoundException(
          `La carrera con ID ${dto.id_carrera} no existe`,
        );
      }
    }

    if (targetSigla !== materia.sigla || targetCarreraId !== materia.id_carrera) {
      const duplicado = await this.materiaRepo.findOne({
        where: {
          sigla: targetSigla,
          id_carrera: targetCarreraId,
        },
      });

      if (duplicado && duplicado.id_materia !== id) {
        throw new ConflictException(
          `Ya existe otra materia con la sigla ${targetSigla} registrada en esta carrera`,
        );
      }
    }

    materia.sigla = targetSigla;
    if (dto.nombre !== undefined) materia.nombre = dto.nombre.trim();
    if (dto.semestre_nivel !== undefined) materia.semestre_nivel = dto.semestre_nivel;
    if (dto.id_carrera !== undefined) materia.id_carrera = dto.id_carrera;
    if (dto.activo !== undefined) materia.activo = dto.activo;

    const actualizada = await this.materiaRepo.save(materia);

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo,
      accion: 'UPDATE',
      tabla_afectada: 'materia',
      id_registro_afectado: String(actualizada.id_materia),
      valores_anteriores: valoresAnteriores,
      valores_nuevos: {
        sigla: actualizada.sigla,
        nombre: actualizada.nombre,
        semestre_nivel: actualizada.semestre_nivel,
        id_carrera: actualizada.id_carrera,
        activo: actualizada.activo,
      },
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[MATERIAS] Materia actualizada: ID ${actualizada.id_materia} (${actualizada.sigla}) por ${ejecutor?.correo || 'Sistema'}`,
    );

    return this.findOne(actualizada.id_materia);
  }

  async cambiarEstado(
    id: number,
    activo: boolean,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    const materia = await this.findOne(id);
    const estadoAnterior = materia.activo;
    materia.activo = activo;
    const guardada = await this.materiaRepo.save(materia);

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo,
      accion: 'CAMBIO_ESTADO',
      tabla_afectada: 'materia',
      id_registro_afectado: String(guardada.id_materia),
      valores_anteriores: { activo: estadoAnterior },
      valores_nuevos: { activo: guardada.activo },
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[MATERIAS] Materia ID ${guardada.id_materia} estado modificado a ${activo ? 'ACTIVO' : 'INACTIVO'} por ${ejecutor?.correo || 'Sistema'}`,
    );

    return guardada;
  }

  async eliminar(
    id: number,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    return this.cambiarEstado(id, false, ejecutor, ipCliente);
  }
}
