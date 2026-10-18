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
import { CarreraMateria } from '../entities/carrera-materia.entity';
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
    @InjectRepository(CarreraMateria)
    private readonly carreraMateriaRepo: Repository<CarreraMateria>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  private mapMateriaResponse(materia: any) {
    // Para retrocompatibilidad y comodidad del frontend, exponemos carrera y semestre_nivel
    // del primer registro de la malla o null
    const primerCM = materia.carreras_materias?.[0];
    return {
      ...materia,
      id_carrera: primerCM?.id_carrera ?? null,
      carrera: primerCM?.carrera ?? null,
      semestre_nivel: primerCM?.semestre_nivel ?? null,
      carreras_asociadas: (materia.carreras_materias || []).map((cm: any) => ({
        id_carrera_materia: cm.id_carrera_materia,
        id_carrera: cm.id_carrera,
        codigo_carrera: cm.carrera?.codigo,
        nombre_carrera: cm.carrera?.nombre,
        semestre_nivel: cm.semestre_nivel,
        activo: cm.activo,
      })),
    };
  }

  async findAll(params?: {
    pagina?: number;
    limite?: number;
    id_carrera?: number;
    semestre?: number;
    busqueda?: string;
    activo?: boolean;
    todos?: boolean;
  }) {
    const qb = this.materiaRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.carreras_materias', 'cm')
      .leftJoinAndSelect('cm.carrera', 'c')
      .orderBy('m.sigla', 'ASC');

    if (params?.id_carrera) {
      qb.andWhere('cm.id_carrera = :id_carrera', {
        id_carrera: params.id_carrera,
      });
    }

    if (params?.semestre) {
      qb.andWhere('cm.semestre_nivel = :semestre', {
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

    if (params?.todos) {
      const all = await qb.getMany();
      return all.map((m) => this.mapMateriaResponse(m));
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
      items: items.map((m) => this.mapMateriaResponse(m)),
    };
  }

  async findOne(id: number) {
    const materia = await this.materiaRepo.findOne({
      where: { id_materia: id },
      relations: {
        carreras_materias: {
          carrera: true,
        },
      },
    });

    if (!materia) {
      throw new NotFoundException(`Materia con ID ${id} no encontrada`);
    }

    return this.mapMateriaResponse(materia);
  }

  async crear(
    dto: CrearMateriaDto,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    const sigla = dto.sigla.trim().toUpperCase();
    const nombre = dto.nombre.trim();

    const existe = await this.materiaRepo.findOne({
      where: { sigla },
    });

    if (existe) {
      throw new ConflictException(
        `Ya existe una materia registrada con la sigla ${sigla} ("${existe.nombre}")`,
      );
    }

    // Resolver lista de carreras a asociar
    let carrerasAAsociar: Array<{ id_carrera: number; semestre_nivel: number }> = [];
    if (dto.carreras && dto.carreras.length > 0) {
      carrerasAAsociar = dto.carreras;
    } else if (dto.id_carrera) {
      carrerasAAsociar = [
        {
          id_carrera: dto.id_carrera,
          semestre_nivel: dto.semestre_nivel || 1,
        },
      ];
    }

    // Validar que existan las carreras
    for (const ca of carrerasAAsociar) {
      const c = await this.carreraRepo.findOne({ where: { id_carrera: ca.id_carrera } });
      if (!c) {
        throw new NotFoundException(`La carrera con ID ${ca.id_carrera} no existe`);
      }
    }

    const nuevaMateria = this.materiaRepo.create({
      sigla,
      nombre,
      activo: dto.activo !== undefined ? dto.activo : true,
    });

    const guardada = await this.materiaRepo.save(nuevaMateria);

    // Guardar asignaciones en carrera_materia
    for (const ca of carrerasAAsociar) {
      await this.carreraMateriaRepo.save(
        this.carreraMateriaRepo.create({
          id_carrera: ca.id_carrera,
          id_materia: guardada.id_materia,
          semestre_nivel: ca.semestre_nivel,
          activo: true,
        }),
      );
    }

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo,
      accion: 'INSERT',
      tabla_afectada: 'materia',
      id_registro_afectado: String(guardada.id_materia),
      valores_nuevos: {
        sigla: guardada.sigla,
        nombre: guardada.nombre,
        carreras: carrerasAAsociar,
        activo: guardada.activo,
      },
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[MATERIAS] Materia creada: ID ${guardada.id_materia} (${guardada.sigla} - ${guardada.nombre}) con ${carrerasAAsociar.length} carreras por ${ejecutor?.correo || 'Sistema'}`,
    );

    return this.findOne(guardada.id_materia);
  }

  async actualizar(
    id: number,
    dto: ActualizarMateriaDto,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    const materia = await this.materiaRepo.findOne({
      where: { id_materia: id },
      relations: { carreras_materias: true },
    });

    if (!materia) {
      throw new NotFoundException(`Materia con ID ${id} no encontrada`);
    }

    const valoresAnteriores = {
      sigla: materia.sigla,
      nombre: materia.nombre,
      activo: materia.activo,
      carreras: materia.carreras_materias?.map((cm) => ({
        id_carrera: cm.id_carrera,
        semestre_nivel: cm.semestre_nivel,
      })),
    };

    if (dto.sigla) {
      const siglaNueva = dto.sigla.trim().toUpperCase();
      if (siglaNueva !== materia.sigla) {
        const duplicado = await this.materiaRepo.findOne({ where: { sigla: siglaNueva } });
        if (duplicado && duplicado.id_materia !== id) {
          throw new ConflictException(
            `Ya existe otra materia con la sigla ${siglaNueva}`,
          );
        }
        materia.sigla = siglaNueva;
      }
    }

    if (dto.nombre !== undefined) materia.nombre = dto.nombre.trim();
    if (dto.activo !== undefined) materia.activo = dto.activo;

    const actualizada = await this.materiaRepo.save(materia);

    // Si se enviaron carreras, sincronizar carrera_materia
    if (dto.carreras !== undefined) {
      // Eliminar actuales y recrear
      await this.carreraMateriaRepo.delete({ id_materia: id });
      for (const ca of dto.carreras) {
        await this.carreraMateriaRepo.save(
          this.carreraMateriaRepo.create({
            id_carrera: ca.id_carrera,
            id_materia: id,
            semestre_nivel: ca.semestre_nivel,
            activo: true,
          }),
        );
      }
    } else if (dto.id_carrera !== undefined) {
      // Caso 1 sola carrera
      const semestre = dto.semestre_nivel || 1;
      await this.carreraMateriaRepo.delete({ id_materia: id });
      await this.carreraMateriaRepo.save(
        this.carreraMateriaRepo.create({
          id_carrera: dto.id_carrera,
          id_materia: id,
          semestre_nivel: semestre,
          activo: true,
        }),
      );
    }

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
    const materia = await this.materiaRepo.findOne({ where: { id_materia: id } });
    if (!materia) {
      throw new NotFoundException(`Materia con ID ${id} no encontrada`);
    }
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

    return this.findOne(guardada.id_materia);
  }

  async eliminar(
    id: number,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    return this.cambiarEstado(id, false, ejecutor, ipCliente);
  }
}
