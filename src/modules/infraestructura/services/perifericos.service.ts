import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PerifericoInventario } from '../entities/periferico-inventario.entity';
import { TipoPeriferico } from '../entities/tipo-periferico.entity';
import { Computadora } from '../entities/computadora.entity';
import { RegistrarPerifericoDto } from '../dto/registrar-periferico.dto';
import { ActualizarPerifericoDto } from '../dto/actualizar-periferico.dto';
import { AsignarPerifericoDto } from '../dto/asignar-periferico.dto';
import { AuditoriaService } from '../../auditoria/auditoria.service';

@Injectable()
export class PerifericosService {
  private readonly logger = new Logger(PerifericosService.name);

  constructor(
    @InjectRepository(PerifericoInventario)
    private readonly perifericoRepo: Repository<PerifericoInventario>,
    @InjectRepository(TipoPeriferico)
    private readonly tipoRepo: Repository<TipoPeriferico>,
    @InjectRepository(Computadora)
    private readonly computadoraRepo: Repository<Computadora>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async getTipos() {
    return this.tipoRepo.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });
  }

  async crearTipo(nombre: string) {
    const nombreClean = nombre.trim().toUpperCase();
    const existe = await this.tipoRepo.findOne({
      where: { nombre: nombreClean },
    });
    if (existe) {
      return existe;
    }
    const nuevo = this.tipoRepo.create({
      nombre: nombreClean,
      activo: true,
    });
    return this.tipoRepo.save(nuevo);
  }

  async findAll(params?: {
    busqueda?: string;
    id_tipo_periferico?: number;
    condicion_fisica?: string;
    id_computadora?: number;
    en_bodega?: boolean;
    activo?: boolean;
    pagina?: number;
    limite?: number;
  }) {
    const qb = this.perifericoRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.tipo', 'tipo')
      .leftJoinAndSelect('p.computadora', 'c')
      .leftJoinAndSelect('c.sala', 's');

    if (params?.busqueda && params.busqueda.trim() !== '') {
      const term = `%${params.busqueda.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(p.marca_modelo) LIKE :term OR LOWER(COALESCE(p.numero_serie, \'\')) LIKE :term OR LOWER(COALESCE(c.codigo_equipo, \'\')) LIKE :term OR LOWER(COALESCE(s.nombre, \'\')) LIKE :term)',
        { term },
      );
    }

    if (params?.id_tipo_periferico) {
      qb.andWhere('p.id_tipo_periferico = :idTipo', {
        idTipo: params.id_tipo_periferico,
      });
    }

    if (params?.condicion_fisica && params.condicion_fisica.trim() !== '') {
      qb.andWhere('p.condicion_fisica = :condicion', {
        condicion: params.condicion_fisica,
      });
    }

    if (params?.en_bodega === true) {
      qb.andWhere('p.id_computadora IS NULL');
    } else if (params?.id_computadora) {
      qb.andWhere('p.id_computadora = :idPc', {
        idPc: params.id_computadora,
      });
    }

    if (params?.activo !== undefined && params.activo !== null) {
      qb.andWhere('p.activo = :activo', { activo: params.activo });
    }

    qb.orderBy('p.id_periferico', 'DESC');

    const pagina = params?.pagina && params.pagina > 0 ? Number(params.pagina) : 1;
    const limite = params?.limite && params.limite > 0 ? Number(params.limite) : 15;

    const total = await qb.getCount();
    const data = await qb
      .skip((pagina - 1) * limite)
      .take(limite)
      .getMany();

    return {
      data,
      total,
      pagina,
      limite,
      total_paginas: Math.ceil(total / limite),
    };
  }

  async findOne(id: number) {
    const p = await this.perifericoRepo.findOne({
      where: { id_periferico: id },
      relations: {
        tipo: true,
        computadora: {
          sala: true,
        },
      },
    });

    if (!p) {
      throw new NotFoundException(`Periférico con ID ${id} no encontrado`);
    }

    return p;
  }

  async registrar(
    dto: RegistrarPerifericoDto,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    const tipo = await this.tipoRepo.findOne({
      where: { id_tipo_periferico: dto.id_tipo_periferico },
    });
    if (!tipo) {
      throw new NotFoundException(
        `Tipo de periférico con ID ${dto.id_tipo_periferico} no encontrado`,
      );
    }

    if (dto.numero_serie && dto.numero_serie.trim() !== '') {
      const serie = dto.numero_serie.trim();
      const existeSerie = await this.perifericoRepo.findOne({
        where: { numero_serie: serie },
      });
      if (existeSerie) {
        throw new ConflictException(
          `Ya existe un periférico registrado con el número de serie "${serie}"`,
        );
      }
    }

    if (dto.id_computadora) {
      const pc = await this.computadoraRepo.findOne({
        where: { id_computadora: dto.id_computadora },
      });
      if (!pc) {
        throw new NotFoundException(
          `Computadora con ID ${dto.id_computadora} no encontrada`,
        );
      }
    }

    const nuevo = this.perifericoRepo.create({
      id_tipo_periferico: dto.id_tipo_periferico,
      id_computadora: dto.id_computadora ?? null,
      marca_modelo: dto.marca_modelo.trim(),
      numero_serie: dto.numero_serie ? dto.numero_serie.trim() : null,
      condicion_fisica: dto.condicion_fisica ?? 'BUENO',
      activo: true,
    });

    const guardado = await this.perifericoRepo.save(nuevo);

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo || 'sistema@uagrm.edu.bo',
      accion: 'CREAR',
      tabla_afectada: 'periferico_inventario',
      id_registro_afectado: String(guardado.id_periferico),
      valores_nuevos: guardado,
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[PERIFERICOS] Periférico ${guardado.marca_modelo} (${tipo.nombre}) registrado por ${ejecutor?.correo || 'Sistema'}`,
    );

    return this.findOne(guardado.id_periferico);
  }

  async actualizar(
    id: number,
    dto: ActualizarPerifericoDto,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    const periferico = await this.perifericoRepo.findOne({
      where: { id_periferico: id },
    });

    if (!periferico) {
      throw new NotFoundException(`Periférico con ID ${id} no encontrado`);
    }

    const valoresAnteriores = { ...periferico };

    if (dto.id_tipo_periferico) {
      const tipo = await this.tipoRepo.findOne({
        where: { id_tipo_periferico: dto.id_tipo_periferico },
      });
      if (!tipo) {
        throw new NotFoundException(
          `Tipo de periférico con ID ${dto.id_tipo_periferico} no encontrado`,
        );
      }
      periferico.id_tipo_periferico = dto.id_tipo_periferico;
    }

    if (dto.numero_serie !== undefined) {
      if (dto.numero_serie && dto.numero_serie.trim() !== '') {
        const serie = dto.numero_serie.trim();
        if (serie !== periferico.numero_serie) {
          const existe = await this.perifericoRepo.findOne({
            where: { numero_serie: serie },
          });
          if (existe) {
            throw new ConflictException(
              `El número de serie "${serie}" ya pertenece a otro periférico`,
            );
          }
        }
        periferico.numero_serie = serie;
      } else {
        periferico.numero_serie = null;
      }
    }

    if (dto.id_computadora !== undefined) {
      if (dto.id_computadora) {
        const pc = await this.computadoraRepo.findOne({
          where: { id_computadora: dto.id_computadora },
        });
        if (!pc) {
          throw new NotFoundException(
            `Computadora con ID ${dto.id_computadora} no encontrada`,
          );
        }
        periferico.id_computadora = dto.id_computadora;
      } else {
        periferico.id_computadora = null;
      }
    }

    if (dto.marca_modelo !== undefined) periferico.marca_modelo = dto.marca_modelo.trim();
    if (dto.condicion_fisica !== undefined) periferico.condicion_fisica = dto.condicion_fisica;
    if (dto.activo !== undefined) periferico.activo = dto.activo;

    const actualizado = await this.perifericoRepo.save(periferico);

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo || 'sistema@uagrm.edu.bo',
      accion: 'ACTUALIZAR',
      tabla_afectada: 'periferico_inventario',
      id_registro_afectado: String(actualizado.id_periferico),
      valores_anteriores: valoresAnteriores,
      valores_nuevos: actualizado,
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[PERIFERICOS] Periférico ID ${actualizado.id_periferico} actualizado por ${ejecutor?.correo || 'Sistema'}`,
    );

    return this.findOne(actualizado.id_periferico);
  }

  async asignar(
    id: number,
    dto: AsignarPerifericoDto,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    const periferico = await this.perifericoRepo.findOne({
      where: { id_periferico: id },
    });

    if (!periferico) {
      throw new NotFoundException(`Periférico con ID ${id} no encontrado`);
    }

    const valoresAnteriores = { ...periferico };

    if (dto.id_computadora) {
      const pc = await this.computadoraRepo.findOne({
        where: { id_computadora: dto.id_computadora },
      });
      if (!pc) {
        throw new NotFoundException(
          `Computadora con ID ${dto.id_computadora} no encontrada`,
        );
      }
      periferico.id_computadora = dto.id_computadora;
    } else {
      periferico.id_computadora = null;
    }

    const actualizado = await this.perifericoRepo.save(periferico);

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo || 'sistema@uagrm.edu.bo',
      accion: 'ASIGNAR',
      tabla_afectada: 'periferico_inventario',
      id_registro_afectado: String(actualizado.id_periferico),
      valores_anteriores: valoresAnteriores,
      valores_nuevos: {
        id_computadora: actualizado.id_computadora,
        ubicacion: actualizado.id_computadora ? `PC_${actualizado.id_computadora}` : 'BODEGA',
      },
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[PERIFERICOS] Periférico ID ${actualizado.id_periferico} reasignado a ${actualizado.id_computadora ? `PC ${actualizado.id_computadora}` : 'BODEGA'} por ${ejecutor?.correo || 'Sistema'}`,
    );

    return this.findOne(actualizado.id_periferico);
  }

  async eliminar(
    id: number,
    ejecutor?: { id_usuario?: number; correo?: string },
    ipCliente?: string,
  ) {
    const periferico = await this.perifericoRepo.findOne({
      where: { id_periferico: id },
    });

    if (!periferico) {
      throw new NotFoundException(`Periférico con ID ${id} no encontrado`);
    }

    const valoresAnteriores = { ...periferico };
    periferico.activo = !periferico.activo;
    const guardado = await this.perifericoRepo.save(periferico);

    await this.auditoriaService.registrar({
      id_usuario: ejecutor?.id_usuario,
      correo_usuario: ejecutor?.correo || 'sistema@uagrm.edu.bo',
      accion: guardado.activo ? 'RESTAURAR' : 'DESACTIVAR',
      tabla_afectada: 'periferico_inventario',
      id_registro_afectado: String(guardado.id_periferico),
      valores_anteriores: valoresAnteriores,
      valores_nuevos: guardado,
      ip_cliente: ipCliente,
    });

    this.logger.log(
      `[PERIFERICOS] Periférico ID ${guardado.id_periferico} ${guardado.activo ? 'reactivado' : 'desactivado'} por ${ejecutor?.correo || 'Sistema'}`,
    );

    return guardado;
  }
}
