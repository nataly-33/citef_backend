import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Carrera } from '../entities/carrera.entity';
import { CrearCarreraDto } from '../dto/crear-carrera.dto';
import { ActualizarCarreraDto } from '../dto/actualizar-carrera.dto';
import { AuditoriaService } from '../../auditoria/auditoria.service';

@Injectable()
export class CarrerasService {
  private readonly logger = new Logger(CarrerasService.name);

  constructor(
    @InjectRepository(Carrera)
    private readonly carreraRepo: Repository<Carrera>,
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
      const qb = this.carreraRepo
        .createQueryBuilder('c')
        .orderBy('c.nombre', 'ASC');

      if (params.activo !== undefined) {
        qb.andWhere('c.activo = :activo', { activo: params.activo });
      }

      if (params.busqueda) {
        qb.andWhere('(c.codigo ILIKE :q OR c.nombre ILIKE :q)', {
          q: `%${params.busqueda}%`,
        });
      }

      return qb.getMany();
    }

    const limite = params?.limite || 15;
    const pagina = params?.pagina || 1;
    const skip = (pagina - 1) * limite;

    const qb = this.carreraRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.carreras_materias', 'cm')
      .leftJoinAndSelect('cm.materia', 'm')
      .orderBy('c.nombre', 'ASC')
      .take(limite)
      .skip(skip);

    if (params?.activo !== undefined) {
      qb.andWhere('c.activo = :activo', { activo: params.activo });
    }

    if (params?.busqueda) {
      qb.andWhere('(c.codigo ILIKE :q OR c.nombre ILIKE :q)', {
        q: `%${params.busqueda}%`,
      });
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
    const carrera = await this.carreraRepo.findOne({
      where: { id_carrera: id },
      relations: {
        carreras_materias: {
          materia: true,
        },
      },
      order: {
        carreras_materias: {
          semestre_nivel: 'ASC',
        },
      },
    });

    if (!carrera) {
      throw new NotFoundException(`Carrera con ID ${id} no encontrada`);
    }

    return carrera;
  }

  async crear(
    dto: CrearCarreraDto,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    const codigo = dto.codigo.trim().toUpperCase();
    const nombre = dto.nombre.trim();

    const existe = await this.carreraRepo.findOne({
      where: { codigo },
    });

    if (existe) {
      throw new ConflictException(
        `Ya existe una carrera registrada con el código ${codigo}`,
      );
    }

    const nuevaCarrera = this.carreraRepo.create({
      codigo,
      nombre,
      activo: dto.activo !== undefined ? dto.activo : true,
    });

    const guardada = await this.carreraRepo.save(nuevaCarrera);

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo,
      accion: 'INSERT',
      tabla_afectada: 'carrera',
      id_registro_afectado: String(guardada.id_carrera),
      valores_nuevos: {
        codigo: guardada.codigo,
        nombre: guardada.nombre,
        activo: guardada.activo,
      },
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[CARRERAS] Carrera creada: ID ${guardada.id_carrera} (${guardada.codigo} - ${guardada.nombre}) por ${ejecutor?.correo || 'Sistema'}`,
    );

    return guardada;
  }

  async actualizar(
    id: number,
    dto: ActualizarCarreraDto,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    const carrera = await this.findOne(id);

    const valoresAnteriores = {
      codigo: carrera.codigo,
      nombre: carrera.nombre,
      activo: carrera.activo,
    };

    if (dto.codigo) {
      const codigo = dto.codigo.trim().toUpperCase();
      if (codigo !== carrera.codigo) {
        const existe = await this.carreraRepo.findOne({
          where: { codigo },
        });
        if (existe) {
          throw new ConflictException(
            `Ya existe otra carrera con el código ${codigo}`,
          );
        }
        carrera.codigo = codigo;
      }
    }

    if (dto.nombre !== undefined) {
      carrera.nombre = dto.nombre.trim();
    }

    if (dto.activo !== undefined) {
      carrera.activo = dto.activo;
    }

    const actualizada = await this.carreraRepo.save(carrera);

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo,
      accion: 'UPDATE',
      tabla_afectada: 'carrera',
      id_registro_afectado: String(actualizada.id_carrera),
      valores_anteriores: valoresAnteriores,
      valores_nuevos: {
        codigo: actualizada.codigo,
        nombre: actualizada.nombre,
        activo: actualizada.activo,
      },
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[CARRERAS] Carrera actualizada: ID ${actualizada.id_carrera} (${actualizada.codigo}) por ${ejecutor?.correo || 'Sistema'}`,
    );

    return actualizada;
  }

  async cambiarEstado(
    id: number,
    activo: boolean,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    const carrera = await this.findOne(id);
    const estadoAnterior = carrera.activo;
    carrera.activo = activo;
    const guardada = await this.carreraRepo.save(carrera);

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo,
      accion: 'CAMBIO_ESTADO',
      tabla_afectada: 'carrera',
      id_registro_afectado: String(guardada.id_carrera),
      valores_anteriores: { activo: estadoAnterior },
      valores_nuevos: { activo: guardada.activo },
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[CARRERAS] Carrera ID ${guardada.id_carrera} estado modificado a ${activo ? 'ACTIVO' : 'INACTIVO'} por ${ejecutor?.correo || 'Sistema'}`,
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
