import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JornadaTurno, EstadoJornada } from '../entities/jornada-turno.entity';
import { ActaRelevo } from '../entities/acta-relevo.entity';
import { AveriaEquipo, EstadoAveria } from '../entities/averia-equipo.entity';
import {
  ObjetoExtraviado,
  EstadoObjeto,
} from '../entities/objeto-extraviado.entity';
import { LaboratorioSala } from '../../infraestructura/entities/laboratorio-sala.entity';
import { Computadora } from '../../infraestructura/entities/computadora.entity';
import { AsignacionSesion } from '../../ocupacion/entities/asignacion-sesion.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { AbrirTurnoDto } from '../dto/abrir-turno.dto';
import { CerrarTurnoDto } from '../dto/cerrar-turno.dto';
import { CrearActaRelevoDto } from '../dto/crear-acta-relevo.dto';
import { FirmarActaRelevoDto } from '../dto/firmar-acta-relevo.dto';
import { FiltroJornadasDto } from '../dto/filtro-jornadas.dto';
import { FiltroActasDto } from '../dto/filtro-actas.dto';

@Injectable()
export class TurnosService {
  constructor(
    @InjectRepository(JornadaTurno)
    private readonly jornadaRepo: Repository<JornadaTurno>,
    @InjectRepository(ActaRelevo)
    private readonly actaRepo: Repository<ActaRelevo>,
    @InjectRepository(LaboratorioSala)
    private readonly salaRepo: Repository<LaboratorioSala>,
    @InjectRepository(Computadora)
    private readonly computadoraRepo: Repository<Computadora>,
    @InjectRepository(AsignacionSesion)
    private readonly sesionRepo: Repository<AsignacionSesion>,
    @InjectRepository(AveriaEquipo)
    private readonly averiaRepo: Repository<AveriaEquipo>,
    @InjectRepository(ObjetoExtraviado)
    private readonly objetoRepo: Repository<ObjetoExtraviado>,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * CU21: Apertura de turno de guardia con verificación de checklist inicial
   */
  async abrirTurno(
    dto: AbrirTurnoDto,
    idUsuario: number,
    ip?: string,
  ): Promise<JornadaTurno> {
    const sala = await this.salaRepo.findOne({
      where: { id_sala: dto.id_sala },
    });
    if (!sala) {
      throw new NotFoundException(`La sala con ID ${dto.id_sala} no existe`);
    }

    // Verificar si ya hay una jornada activa en la sala
    const jornadaActivaSala = await this.jornadaRepo.findOne({
      where: { id_sala: dto.id_sala, estado: EstadoJornada.EN_CURSO },
    });
    if (jornadaActivaSala) {
      throw new BadRequestException(
        `Ya existe un turno activo en la sala ${sala.codigo_sala} (Jornada #${jornadaActivaSala.id_jornada})`,
      );
    }

    // Verificar si el auxiliar ya tiene una jornada activa
    const jornadaActivaAuxiliar = await this.jornadaRepo.findOne({
      where: { id_usuario_auxiliar: idUsuario, estado: EstadoJornada.EN_CURSO },
    });
    if (jornadaActivaAuxiliar) {
      throw new BadRequestException(
        `El auxiliar ya tiene un turno activo en curso (Jornada #${jornadaActivaAuxiliar.id_jornada})`,
      );
    }

    const ahora = new Date();
    const fecha = ahora.toISOString().split('T')[0];

    const checklistNormalizado = {
      ...dto.checklist_apertura,
      luces: Boolean(dto.checklist_apertura.luces),
      orden:
        dto.checklist_apertura.orden ??
        dto.checklist_apertura.orden_limpieza ??
        true,
      orden_limpieza:
        dto.checklist_apertura.orden_limpieza ??
        dto.checklist_apertura.orden ??
        true,
      aire:
        dto.checklist_apertura.aire ??
        dto.checklist_apertura.aire_acondicionado ??
        true,
      aire_acondicionado:
        dto.checklist_apertura.aire_acondicionado ??
        dto.checklist_apertura.aire ??
        true,
      proyector: Boolean(dto.checklist_apertura.proyector),
      pcs_encendidas: dto.checklist_apertura.pcs_encendidas ?? 0,
      observacion:
        dto.checklist_apertura.observacion ??
        dto.checklist_apertura.observaciones ??
        null,
      observaciones:
        dto.checklist_apertura.observaciones ??
        dto.checklist_apertura.observacion ??
        null,
    };

    const nuevaJornada = this.jornadaRepo.create({
      id_usuario_auxiliar: idUsuario,
      id_sala: dto.id_sala,
      id_asignar_turno: dto.id_asignar_turno ?? null,
      fecha,
      hora_apertura: ahora,
      checklist_apertura: checklistNormalizado,
      checklist_cierre: null,
      cant_estudiantes_atendidos: 0,
      cant_averias_reportadas: 0,
      cant_objetos_custodiados: 0,
      obs_cierre: null,
      estado: EstadoJornada.EN_CURSO,
    });

    const guardada = await this.jornadaRepo.save(nuevaJornada);

    await this.auditoriaService.registrar({
      id_usuario: idUsuario,
      accion: 'APERTURA_TURNO',
      tabla_afectada: 'jornada_turno',
      id_registro_afectado: String(guardada.id_jornada),
      valores_nuevos: guardada as any,
      ip_cliente: ip,
    });

    return guardada;
  }

  /**
   * Obtener jornada activa para un auxiliar o sala
   */
  async getJornadaActiva(
    idUsuario?: number,
    idSala?: number,
  ): Promise<JornadaTurno | null> {
    const qb = this.jornadaRepo
      .createQueryBuilder('j')
      .leftJoinAndSelect('j.sala', 'sala')
      .leftJoinAndSelect('j.auxiliar', 'auxiliar')
      .leftJoinAndSelect('j.asignacion_turno', 'asignacion_turno')
      .where('j.estado = :estado', { estado: EstadoJornada.EN_CURSO });

    if (idSala) {
      qb.andWhere('j.id_sala = :idSala', { idSala });
    }
    if (idUsuario) {
      qb.andWhere('j.id_usuario_auxiliar = :idUsuario', { idUsuario });
    }

    qb.orderBy('j.hora_apertura', 'DESC');
    const jornada = await qb.getOne();

    if (jornada) {
      // Calcular métricas en vivo en tiempo real
      const cantEstudiantes = await this.sesionRepo
        .createQueryBuilder('s')
        .innerJoin('s.computadora', 'c')
        .where('c.id_sala = :idSala', { idSala: jornada.id_sala })
        .andWhere('s.fecha_hora_inicio >= :horaApertura', {
          horaApertura: jornada.hora_apertura,
        })
        .getCount();

      const cantAverias = await this.averiaRepo
        .createQueryBuilder('a')
        .where(
          '(a.id_jornada = :idJornada OR (a.id_sala = :idSala AND a.fecha_reporte >= :horaApertura))',
          {
            idJornada: jornada.id_jornada,
            idSala: jornada.id_sala,
            horaApertura: jornada.hora_apertura,
          },
        )
        .getCount();

      const cantObjetos = await this.objetoRepo
        .createQueryBuilder('o')
        .where(
          '(o.id_jornada_hallazgo = :idJornada OR (o.id_sala = :idSala AND o.fecha_hora_hallazgo >= :horaApertura))',
          {
            idJornada: jornada.id_jornada,
            idSala: jornada.id_sala,
            horaApertura: jornada.hora_apertura,
          },
        )
        .getCount();

      jornada.cant_estudiantes_atendidos = cantEstudiantes;
      jornada.cant_averias_reportadas = cantAverias;
      jornada.cant_objetos_custodiados = cantObjetos;
    }

    return jornada;
  }

  /**
   * CU21: Cierre formal de turno de guardia, consolidando métricas operativas
   */
  async cerrarTurno(
    idJornada: number,
    dto: CerrarTurnoDto,
    idUsuario: number,
    ip?: string,
  ): Promise<JornadaTurno> {
    const jornada = await this.jornadaRepo.findOne({
      where: { id_jornada: idJornada },
      relations: { sala: true, auxiliar: true },
    });

    if (!jornada) {
      throw new NotFoundException(
        `La jornada con ID ${idJornada} no fue encontrada`,
      );
    }

    if (jornada.estado !== EstadoJornada.EN_CURSO) {
      throw new BadRequestException(
        `La jornada no se encuentra en curso (Estado actual: ${jornada.estado})`,
      );
    }

    // 1. Contar estudiantes atendidos en la sala durante la jornada
    const cantEstudiantes = await this.sesionRepo
      .createQueryBuilder('s')
      .innerJoin('s.computadora', 'c')
      .where('c.id_sala = :idSala', { idSala: jornada.id_sala })
      .andWhere('s.fecha_hora_inicio >= :horaApertura', {
        horaApertura: jornada.hora_apertura,
      })
      .getCount();

    // 2. Contar averías reportadas vinculadas a la jornada o en la sala durante el turno
    const cantAverias = await this.averiaRepo
      .createQueryBuilder('a')
      .where(
        '(a.id_jornada = :idJornada OR (a.id_sala = :idSala AND a.fecha_reporte >= :horaApertura))',
        {
          idJornada: jornada.id_jornada,
          idSala: jornada.id_sala,
          horaApertura: jornada.hora_apertura,
        },
      )
      .getCount();

    // 3. Contar objetos en custodia registrados durante el turno
    const cantObjetos = await this.objetoRepo
      .createQueryBuilder('o')
      .where(
        '(o.id_jornada_hallazgo = :idJornada OR (o.id_sala = :idSala AND o.fecha_hora_hallazgo >= :horaApertura))',
        {
          idJornada: jornada.id_jornada,
          idSala: jornada.id_sala,
          horaApertura: jornada.hora_apertura,
        },
      )
      .getCount();

    const valoresAnteriores = { ...jornada };
    const tieneObs = !!dto.obs_cierre && dto.obs_cierre.trim().length > 0;
    const tieneNovedades = cantAverias > 0 || tieneObs;
    const nuevoEstado = tieneNovedades
      ? EstadoJornada.CERRADO_CON_NOVEDADES
      : EstadoJornada.CERRADO_NORMAL;

    jornada.hora_cierre = new Date();
    jornada.checklist_cierre = dto.checklist_cierre ?? null;
    jornada.obs_cierre = dto.obs_cierre ?? null;
    jornada.cant_estudiantes_atendidos = cantEstudiantes;
    jornada.cant_averias_reportadas = cantAverias;
    jornada.cant_objetos_custodiados = cantObjetos;
    jornada.estado = nuevoEstado;

    const actualizada = await this.jornadaRepo.save(jornada);

    await this.auditoriaService.registrar({
      id_usuario: idUsuario,
      accion: 'CIERRE_TURNO',
      tabla_afectada: 'jornada_turno',
      id_registro_afectado: String(actualizada.id_jornada),
      valores_anteriores: valoresAnteriores,
      valores_nuevos: actualizada as any,
      ip_cliente: ip,
    });

    // CU21: Generación automática de Acta de Relevo (Composición de fin de jornada)
    const cantOperativos = await this.computadoraRepo.count({
      where: {
        id_sala: jornada.id_sala,
        estado_actual: 'DISPONIBLE',
        activo: true,
      },
    });

    const cantAveriasPend = await this.averiaRepo
      .createQueryBuilder('a')
      .where('a.id_sala = :idSala', { idSala: jornada.id_sala })
      .andWhere('a.estado IN (:...estados)', {
        estados: [EstadoAveria.PENDIENTE_REVISION, EstadoAveria.EN_TALLER],
      })
      .getCount();

    const cantObjetosCustodia = await this.objetoRepo.count({
      where: {
        id_sala: jornada.id_sala,
        estado: EstadoObjeto.BAJO_CUSTODIA,
      },
    });

    const acta = this.actaRepo.create({
      id_jornada_saliente: actualizada.id_jornada,
      id_usuario_saliente: idUsuario,
      id_usuario_entrante: dto.id_usuario_entrante ?? null,
      fecha_hora_relevo: new Date(),
      cant_equipos_operativos: cantOperativos,
      cant_averias_pend: cantAveriasPend,
      cant_objetos_custodia: cantObjetosCustodia,
      novedades: dto.obs_cierre ?? null,
      aceptado_por_entrante: false,
      fecha_hora_conformidad: null,
      obs_discrepancia: null,
    });

    const actaGuardada = await this.actaRepo.save(acta);

    await this.auditoriaService.registrar({
      id_usuario: idUsuario,
      accion: 'EMISION_AUTOMATICA_ACTA_RELEVO',
      tabla_afectada: 'acta_relevo',
      id_registro_afectado: String(actaGuardada.id_acta_relevo),
      valores_nuevos: actaGuardada as any,
      ip_cliente: ip,
    });

    return actualizada;
  }

  /**
   * Listar jornadas con paginación y filtros
   */
  async getJornadas(params: FiltroJornadasDto) {
    const limite = params.limite || params.limit || 15;
    const pagina = params.pagina || params.page || 1;
    const skip = (pagina - 1) * limite;

    const qb = this.jornadaRepo
      .createQueryBuilder('j')
      .leftJoinAndSelect('j.sala', 'sala')
      .leftJoinAndSelect('j.auxiliar', 'auxiliar')
      .leftJoinAndSelect('j.asignacion_turno', 'asignacion_turno')
      .orderBy('j.hora_apertura', 'DESC')
      .take(limite)
      .skip(skip);

    if (params.id_sala) {
      qb.andWhere('j.id_sala = :idSala', { idSala: params.id_sala });
    }
    if (params.fecha) {
      qb.andWhere('CAST(j.fecha AS date) = :fecha', { fecha: params.fecha });
    }
    if (params.estado && params.estado !== 'TODOS') {
      qb.andWhere('j.estado = :estado', { estado: params.estado });
    }
    if (params.id_usuario_auxiliar) {
      qb.andWhere('j.id_usuario_auxiliar = :idAux', {
        idAux: params.id_usuario_auxiliar,
      });
    }
    if (params.busqueda) {
      qb.andWhere(
        '(sala.nombre ILIKE :busqueda OR sala.codigo_sala ILIKE :busqueda OR auxiliar.nombres ILIKE :busqueda OR auxiliar.apellidos ILIKE :busqueda)',
        { busqueda: `%${params.busqueda}%` },
      );
    }

    const [items, total] = await qb.getManyAndCount();

    const sanitizedItems = items.map((j) => {
      if (j.auxiliar) {
        const { password_hash: _password_hash, ...rest } = j.auxiliar;
        j.auxiliar = rest as any;
      }
      return j;
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
   * CU21: Generar acta de relevo (Handover) al culminar guardia
   */
  async crearActaRelevo(
    idJornada: number,
    dto: CrearActaRelevoDto,
    idUsuarioSaliente: number,
    ip?: string,
  ): Promise<ActaRelevo> {
    const jornada = await this.jornadaRepo.findOne({
      where: { id_jornada: idJornada },
      relations: { sala: true },
    });

    if (!jornada) {
      throw new NotFoundException(`La jornada con ID ${idJornada} no existe`);
    }

    const usuarioEntrante = await this.usuarioRepo.findOne({
      where: { id_usuario: dto.id_usuario_entrante },
    });
    if (!usuarioEntrante) {
      throw new NotFoundException(
        `El usuario auxiliar entrante con ID ${dto.id_usuario_entrante} no existe`,
      );
    }

    // Contar computadoras operativas y disponibles en la sala
    const cantOperativos = await this.computadoraRepo.count({
      where: {
        id_sala: jornada.id_sala,
        estado_actual: 'DISPONIBLE',
        activo: true,
      },
    });

    // Contar averías pendientes o en taller
    const cantAveriasPend = await this.averiaRepo
      .createQueryBuilder('a')
      .where('a.id_sala = :idSala', { idSala: jornada.id_sala })
      .andWhere('a.estado IN (:...estados)', {
        estados: [EstadoAveria.PENDIENTE_REVISION, EstadoAveria.EN_TALLER],
      })
      .getCount();

    // Contar objetos bajo custodia
    const cantObjetosCustodia = await this.objetoRepo.count({
      where: {
        id_sala: jornada.id_sala,
        estado: EstadoObjeto.BAJO_CUSTODIA,
      },
    });

    const acta = this.actaRepo.create({
      id_jornada_saliente: idJornada,
      id_usuario_saliente: idUsuarioSaliente,
      id_usuario_entrante: dto.id_usuario_entrante,
      fecha_hora_relevo: new Date(),
      cant_equipos_operativos: cantOperativos,
      cant_averias_pend: cantAveriasPend,
      cant_objetos_custodia: cantObjetosCustodia,
      novedades: dto.novedades ?? null,
      aceptado_por_entrante: false,
      fecha_hora_conformidad: null,
      obs_discrepancia: null,
    });

    const guardada = await this.actaRepo.save(acta);

    // Marcar la jornada como relevada si aún figuraba en curso
    if (jornada.estado === EstadoJornada.EN_CURSO) {
      jornada.estado = EstadoJornada.RELEVADO;
      await this.jornadaRepo.save(jornada);
    }

    await this.auditoriaService.registrar({
      id_usuario: idUsuarioSaliente,
      accion: 'CREAR_ACTA_RELEVO',
      tabla_afectada: 'acta_relevo',
      id_registro_afectado: String(guardada.id_acta_relevo),
      valores_nuevos: guardada as any,
      ip_cliente: ip,
    });

    return guardada;
  }

  /**
   * CU21: Firma digital y conformidad del acta de relevo por el auxiliar entrante
   */
  async firmarActaRelevo(
    idActa: number,
    dto: FirmarActaRelevoDto,
    idUsuarioEntrante: number,
    ip?: string,
  ): Promise<ActaRelevo> {
    const acta = await this.actaRepo.findOne({
      where: { id_acta_relevo: idActa },
      relations: {
        jornada_saliente: true,
        usuario_saliente: true,
        usuario_entrante: true,
      },
    });

    if (!acta) {
      throw new NotFoundException(`El acta de relevo #${idActa} no existe`);
    }

    if (acta.aceptado_por_entrante) {
      throw new BadRequestException(
        'El acta de relevo ya ha sido firmada y confirmada previamente',
      );
    }

    if (
      acta.id_usuario_entrante &&
      Number(acta.id_usuario_entrante) !== Number(idUsuarioEntrante)
    ) {
      throw new BadRequestException('El auxiliar designado debe firmar');
    }

    const aceptado =
      dto.aceptado !== undefined ? dto.aceptado : (dto.conforme ?? true);
    const valoresAnteriores = { ...acta };
    acta.aceptado_por_entrante = aceptado;
    acta.fecha_hora_conformidad = new Date();
    acta.obs_discrepancia = dto.obs_discrepancia ?? null;

    const firmada = await this.actaRepo.save(acta);

    await this.auditoriaService.registrar({
      id_usuario: idUsuarioEntrante,
      accion: 'FIRMA_ACTA_RELEVO',
      tabla_afectada: 'acta_relevo',
      id_registro_afectado: String(firmada.id_acta_relevo),
      valores_anteriores: valoresAnteriores,
      valores_nuevos: firmada as any,
      ip_cliente: ip,
    });

    return firmada;
  }

  /**
   * Listar actas de relevo paginadas
   */
  async getActas(params: FiltroActasDto) {
    const limite = params.limite || params.limit || 15;
    const pagina = params.pagina || params.page || 1;
    const skip = (pagina - 1) * limite;

    const qb = this.actaRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.jornada_saliente', 'jornada')
      .leftJoinAndSelect('jornada.sala', 'sala')
      .leftJoinAndSelect('a.usuario_saliente', 'u_saliente')
      .leftJoinAndSelect('a.usuario_entrante', 'u_entrante')
      .orderBy('a.fecha_hora_relevo', 'DESC')
      .take(limite)
      .skip(skip);

    if (params.id_sala) {
      qb.andWhere('jornada.id_sala = :idSala', { idSala: params.id_sala });
    }
    if (params.id_usuario_saliente) {
      qb.andWhere('a.id_usuario_saliente = :idSaliente', {
        idSaliente: params.id_usuario_saliente,
      });
    }
    if (params.id_usuario_entrante) {
      qb.andWhere('a.id_usuario_entrante = :idEntrante', {
        idEntrante: params.id_usuario_entrante,
      });
    }
    if (params.solo_pendientes_firma) {
      qb.andWhere('a.aceptado_por_entrante = false');
    } else if (params.aceptado_por_entrante !== undefined) {
      qb.andWhere('a.aceptado_por_entrante = :aceptado', {
        aceptado: params.aceptado_por_entrante,
      });
    }
    if (params.fecha) {
      qb.andWhere('CAST(a.fecha_hora_relevo AS date) = :fecha', {
        fecha: params.fecha,
      });
    }
    if (params.busqueda) {
      qb.andWhere(
        '(a.novedades ILIKE :busqueda OR u_saliente.nombres ILIKE :busqueda OR u_saliente.apellidos ILIKE :busqueda OR u_entrante.nombres ILIKE :busqueda OR u_entrante.apellidos ILIKE :busqueda OR sala.nombre ILIKE :busqueda OR sala.codigo_sala ILIKE :busqueda)',
        { busqueda: `%${params.busqueda}%` },
      );
    }

    const [items, total] = await qb.getManyAndCount();

    const sanitizedItems = items.map((a) => {
      if (a.usuario_saliente) {
        const { password_hash: _password_hash, ...uRest } = a.usuario_saliente;
        a.usuario_saliente = uRest as any;
      }
      if (a.usuario_entrante) {
        const { password_hash: _password_hash, ...uRest } = a.usuario_entrante;
        a.usuario_entrante = uRest as any;
      }
      return a;
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
   * Obtener acta de relevo por ID
   */
  async getActaById(idActa: number): Promise<ActaRelevo> {
    const acta = await this.actaRepo.findOne({
      where: { id_acta_relevo: idActa },
      relations: {
        jornada_saliente: { sala: true },
        usuario_saliente: true,
        usuario_entrante: true,
      },
    });

    if (!acta) {
      throw new NotFoundException(`El acta de relevo #${idActa} no existe`);
    }

    if (acta.usuario_saliente) {
      const { password_hash: _password_hash, ...uRest } = acta.usuario_saliente;
      acta.usuario_saliente = uRest as any;
    }
    if (acta.usuario_entrante) {
      const { password_hash: _password_hash, ...uRest } = acta.usuario_entrante;
      acta.usuario_entrante = uRest as any;
    }

    return acta;
  }

  /**
   * CU21: Dashboard de salas para supervisión de guardias activas (Vista Jefatura / Admin)
   */
  async getDashboardSalas() {
    const salas = await this.salaRepo.find({
      where: { activo: true },
      order: { piso: 'ASC', codigo_sala: 'ASC' },
    });

    const jornadasActivas = await this.jornadaRepo.find({
      where: { estado: EstadoJornada.EN_CURSO },
      relations: { auxiliar: true, sala: true },
    });

    const mapaJornadas = new Map<number, JornadaTurno>();
    for (const j of jornadasActivas) {
      mapaJornadas.set(j.id_sala, j);
    }

    const resultado = await Promise.all(
      salas.map(async (sala) => {
        const jornada = mapaJornadas.get(sala.id_sala);
        if (!jornada) {
          return {
            id_sala: sala.id_sala,
            codigo_sala: sala.codigo_sala,
            nombre: sala.nombre,
            piso: sala.piso,
            cant_estudiantes: sala.cant_estudiantes,
            estado_operativo: sala.estado_operativo,
            guardia_activa: false,
            jornada: null,
          };
        }

        const cantEstudiantes = await this.sesionRepo
          .createQueryBuilder('s')
          .innerJoin('s.computadora', 'c')
          .where('c.id_sala = :idSala', { idSala: sala.id_sala })
          .andWhere('s.fecha_hora_inicio >= :horaApertura', {
            horaApertura: jornada.hora_apertura,
          })
          .getCount();

        const cantAverias = await this.averiaRepo
          .createQueryBuilder('a')
          .where(
            '(a.id_jornada = :idJornada OR (a.id_sala = :idSala AND a.fecha_reporte >= :horaApertura))',
            {
              idJornada: jornada.id_jornada,
              idSala: sala.id_sala,
              horaApertura: jornada.hora_apertura,
            },
          )
          .getCount();

        const cantObjetos = await this.objetoRepo
          .createQueryBuilder('o')
          .where(
            '(o.id_jornada_hallazgo = :idJornada OR (o.id_sala = :idSala AND o.fecha_hora_hallazgo >= :horaApertura))',
            {
              idJornada: jornada.id_jornada,
              idSala: sala.id_sala,
              horaApertura: jornada.hora_apertura,
            },
          )
          .getCount();

        return {
          id_sala: sala.id_sala,
          codigo_sala: sala.codigo_sala,
          nombre: sala.nombre,
          piso: sala.piso,
          cant_estudiantes: sala.cant_estudiantes,
          estado_operativo: sala.estado_operativo,
          guardia_activa: true,
          jornada: {
            id_jornada: jornada.id_jornada,
            hora_apertura: jornada.hora_apertura,
            auxiliar: {
              id_usuario: jornada.auxiliar?.id_usuario,
              nombres: jornada.auxiliar?.nombres,
              apellidos: jornada.auxiliar?.apellidos,
              correo: jornada.auxiliar?.correo_institucional,
            },
            cant_estudiantes_atendidos: cantEstudiantes,
            cant_averias_reportadas: cantAverias,
            cant_objetos_custodiados: cantObjetos,
          },
        };
      }),
    );

    return resultado;
  }

  /**
   * Listar usuarios auxiliares disponibles para relevo (acceso auxiliar y admin)
   */
  async getAuxiliaresParaRelevo() {
    const auxiliares = await this.usuarioRepo
      .createQueryBuilder('u')
      .innerJoin('u.roles', 'r')
      .where('r.nombre = :rol', { rol: 'AUXILIAR' })
      .andWhere('u.activo = :activo', { activo: true })
      .select([
        'u.id_usuario',
        'u.nombres',
        'u.apellidos',
        'u.correo_institucional',
      ])
      .orderBy('u.apellidos', 'ASC')
      .getMany();

    return auxiliares;
  }
}
