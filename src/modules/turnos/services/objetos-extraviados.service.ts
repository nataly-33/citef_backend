import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ObjetoExtraviado,
  EstadoObjeto,
} from '../entities/objeto-extraviado.entity';
import { LaboratorioSala } from '../../infraestructura/entities/laboratorio-sala.entity';
import { Estudiante } from '../../ocupacion/entities/estudiante.entity';
import { JornadaTurno, EstadoJornada } from '../entities/jornada-turno.entity';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { RegistrarObjetoDto } from '../dto/registrar-objeto.dto';
import { DevolverObjetoDto } from '../dto/devolver-objeto.dto';
import { FiltroObjetosDto } from '../dto/filtro-objetos.dto';

@Injectable()
export class ObjetosExtraviadosService {
  constructor(
    @InjectRepository(ObjetoExtraviado)
    private readonly objetoRepo: Repository<ObjetoExtraviado>,
    @InjectRepository(LaboratorioSala)
    private readonly salaRepo: Repository<LaboratorioSala>,
    @InjectRepository(Estudiante)
    private readonly estudianteRepo: Repository<Estudiante>,
    @InjectRepository(JornadaTurno)
    private readonly jornadaRepo: Repository<JornadaTurno>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * CU23: Registrar pertenencia extraviada hallada en sala bajo estado de custodia
   */
  async registrarObjeto(
    dto: RegistrarObjetoDto,
    idUsuarioRegistro: number,
    ip?: string,
  ): Promise<ObjetoExtraviado> {
    const sala = await this.salaRepo.findOne({
      where: { id_sala: dto.id_sala },
    });
    if (!sala) {
      throw new NotFoundException(`La sala con ID ${dto.id_sala} no existe`);
    }

    // Vincular con jornada activa en sala si existe
    const jornadaActiva = await this.jornadaRepo.findOne({
      where: { id_sala: dto.id_sala, estado: EstadoJornada.EN_CURSO },
    });

    const fechaHallazgo = dto.fecha_hora_hallazgo
      ? new Date(dto.fecha_hora_hallazgo)
      : new Date();

    const nuevoObjeto = this.objetoRepo.create({
      id_sala: dto.id_sala,
      id_jornada_hallazgo: jornadaActiva?.id_jornada ?? null,
      id_usuario_registro: idUsuarioRegistro,
      categoria: dto.categoria,
      descrip_detallada: dto.descrip_detallada,
      lugar_exacto: dto.lugar_exacto,
      fecha_hora_hallazgo: fechaHallazgo,
      estado: EstadoObjeto.BAJO_CUSTODIA,
      registro_estudiante_receptor: null,
      id_usuario_entrega: null,
      fecha_hora_devolucion: null,
      obs_devolucion: null,
    });

    const guardado = await this.objetoRepo.save(nuevoObjeto);

    // Incrementar contador en jornada activa si aplica
    if (jornadaActiva) {
      jornadaActiva.cant_objetos_custodiados =
        (jornadaActiva.cant_objetos_custodiados || 0) + 1;
      await this.jornadaRepo.save(jornadaActiva);
    }

    await this.auditoriaService.registrar({
      id_usuario: idUsuarioRegistro,
      accion: 'REGISTRAR_OBJETO_EXTRAVIADO',
      tabla_afectada: 'objeto_extraviado',
      id_registro_afectado: String(guardado.id_objeto),
      valores_nuevos: guardado as any,
      ip_cliente: ip,
    });

    return guardado;
  }

  /**
   * CU23: Restitución y entrega formal del objeto acreditando al alumno receptor
   */
  async devolverObjeto(
    idObjeto: number,
    dto: DevolverObjetoDto,
    idUsuarioEntrega: number,
    ip?: string,
  ): Promise<ObjetoExtraviado> {
    const objeto = await this.objetoRepo.findOne({
      where: { id_objeto: idObjeto },
    });

    if (!objeto) {
      throw new NotFoundException(`El objeto con ID #${idObjeto} no existe`);
    }

    if (objeto.estado !== EstadoObjeto.BAJO_CUSTODIA) {
      throw new BadRequestException(
        `El objeto no se encuentra bajo custodia (Estado actual: ${objeto.estado})`,
      );
    }

    let estudiante = await this.estudianteRepo.findOne({
      where: { registro: dto.registro_estudiante_receptor },
    });

    if (!estudiante && dto.nombre_estudiante_receptor) {
      try {
        const nuevoEstudiante = this.estudianteRepo.create({
          registro: dto.registro_estudiante_receptor,
          ci: dto.registro_estudiante_receptor,
          nombres: dto.nombre_estudiante_receptor.trim(),
          apellidos: '',
          id_carrera: 1,
          activo: true,
          sancionado: false,
        });
        estudiante = await this.estudianteRepo.save(nuevoEstudiante);
      } catch {
        estudiante = await this.estudianteRepo.findOne({
          where: { registro: dto.registro_estudiante_receptor },
        });
      }
    }

    if (!estudiante) {
      throw new NotFoundException(
        `El estudiante receptor con registro ${dto.registro_estudiante_receptor} no está registrado`,
      );
    }

    const valoresAnteriores = { ...objeto };
    const nombreEstudiante =
      dto.nombre_estudiante_receptor?.trim() ||
      `${estudiante.nombres} ${estudiante.apellidos}`.trim();

    objeto.estado = EstadoObjeto.DEVUELTO;
    objeto.registro_estudiante_receptor = dto.registro_estudiante_receptor;
    objeto.nombre_estudiante_receptor = nombreEstudiante;
    objeto.id_usuario_entrega = idUsuarioEntrega;
    objeto.fecha_hora_devolucion = new Date();
    objeto.obs_devolucion = dto.obs_devolucion ?? null;

    const actualizado = await this.objetoRepo.save(objeto);

    await this.auditoriaService.registrar({
      id_usuario: idUsuarioEntrega,
      accion: 'DEVOLVER_OBJETO_EXTRAVIADO',
      tabla_afectada: 'objeto_extraviado',
      id_registro_afectado: String(actualizado.id_objeto),
      valores_anteriores: valoresAnteriores,
      valores_nuevos: actualizado as any,
      ip_cliente: ip,
    });

    return actualizado;
  }

  /**
   * Listar objetos extraviados con filtros de búsqueda y paginación
   */
  async getObjetos(params: FiltroObjetosDto) {
    const limite = params.limite || params.limit || 15;
    const pagina = params.pagina || params.page || 1;
    const skip = (pagina - 1) * limite;

    const qb = this.objetoRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.sala', 'sala')
      .leftJoinAndSelect('o.usuario_registro', 'usuario_registro')
      .leftJoinAndSelect('o.usuario_entrega', 'usuario_entrega')
      .leftJoinAndSelect('o.estudiante_receptor', 'estudiante_receptor')
      .orderBy('o.fecha_hora_hallazgo', 'DESC')
      .take(limite)
      .skip(skip);

    if (params.id_sala) {
      qb.andWhere('o.id_sala = :idSala', { idSala: params.id_sala });
    }
    if (params.categoria && params.categoria !== 'TODOS') {
      qb.andWhere('o.categoria = :categoria', { categoria: params.categoria });
    }
    if (params.estado && params.estado !== 'TODOS') {
      qb.andWhere('o.estado = :estado', { estado: params.estado });
    }
    if (params.busqueda) {
      qb.andWhere(
        '(o.descrip_detallada ILIKE :busqueda OR o.lugar_exacto ILIKE :busqueda OR sala.nombre ILIKE :busqueda OR sala.codigo_sala ILIKE :busqueda)',
        { busqueda: `%${params.busqueda}%` },
      );
    }

    const [items, total] = await qb.getManyAndCount();

    const sanitizedItems = items.map((obj) => {
      if (obj.usuario_registro) {
        const { password_hash: _password_hash, ...uRest } = obj.usuario_registro;
        obj.usuario_registro = uRest as any;
      }
      if (obj.usuario_entrega) {
        const { password_hash: _password_hash, ...uRest } = obj.usuario_entrega;
        obj.usuario_entrega = uRest as any;
      }
      return obj;
    });

    return {
      total,
      pagina,
      limite,
      paginas_totales: Math.ceil(total / limite),
      items: sanitizedItems,
      data: sanitizedItems,
    };
  }

  /**
   * Obtener detalle de objeto por ID
   */
  async getObjetoById(idObjeto: number): Promise<ObjetoExtraviado> {
    const objeto = await this.objetoRepo.findOne({
      where: { id_objeto: idObjeto },
      relations: {
        sala: true,
        jornada_hallazgo: true,
        usuario_registro: true,
        usuario_entrega: true,
        estudiante_receptor: true,
      },
    });

    if (!objeto) {
      throw new NotFoundException(`El objeto con ID #${idObjeto} no existe`);
    }

    if (objeto.usuario_registro) {
      const { password_hash: _password_hash, ...uRest } = objeto.usuario_registro;
      objeto.usuario_registro = uRest as any;
    }
    if (objeto.usuario_entrega) {
      const { password_hash: _password_hash, ...uRest } = objeto.usuario_entrega;
      objeto.usuario_entrega = uRest as any;
    }

    return objeto;
  }
}
