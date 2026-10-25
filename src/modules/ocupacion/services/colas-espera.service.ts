import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ColaEsperaSala } from '../entities/cola-espera-sala.entity';
import { LaboratorioSala } from '../../infraestructura/entities/laboratorio-sala.entity';
import { Computadora } from '../../infraestructura/entities/computadora.entity';
import { Estudiante } from '../entities/estudiante.entity';
import { AsignacionSesion } from '../entities/asignacion-sesion.entity';
import { EncolarEstudianteDto } from '../dto/encolar-estudiante.dto';
import { AuditoriaService } from '../../auditoria/auditoria.service';

@Injectable()
export class ColasEsperaService {
  private readonly logger = new Logger(ColasEsperaService.name);

  constructor(
    @InjectRepository(ColaEsperaSala)
    private readonly colaRepo: Repository<ColaEsperaSala>,
    @InjectRepository(LaboratorioSala)
    private readonly salaRepo: Repository<LaboratorioSala>,
    @InjectRepository(Computadora)
    private readonly computadoraRepo: Repository<Computadora>,
    @InjectRepository(Estudiante)
    private readonly estudianteRepo: Repository<Estudiante>,
    @InjectRepository(AsignacionSesion)
    private readonly sesionRepo: Repository<AsignacionSesion>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Calcula el tiempo estimado de espera Wq en minutos aplicando el modelo estocástico M/M/c
   * c: Número de puestos operativos de la sala
   * mu: Tasa de servicio (sesiones por puesto por hora, promedio facultativo: 1.0 sesion/h = 60 min)
   * lambda: Tasa de arribo estimada (alumnos por hora)
   */
  calcularTiempoEsperaEstimado(c: number, tamanoColaActual: number): number {
    if (c <= 0) return 30; // Fallback razonable
    const mu = 1.0; // 1 sesión promedio por puesto por hora (60 min)

    // Tasa efectiva de salida del sistema por hora: c * mu
    // Cada puesto atiende en promedio 1 alumno por hora (o 1 alumno cada 60/c minutos para la sala completa)
    const minutosPorSalidaDePuesto = 60 / (c * mu);

    // El tiempo estimado de espera para el nuevo estudiante es proporcional a su posición en la fila
    const tiempoEstimadoMin = (tamanoColaActual + 1) * minutosPorSalidaDePuesto;
    return Math.max(1, Math.round(tiempoEstimadoMin * 10) / 10);
  }

  async obtenerColaSala(idSala: number) {
    const servidoresC = await this.computadoraRepo.count({
      where: {
        id_sala: idSala,
        activo: true,
        maquina_docente: false,
      },
    });

    const cola = await this.colaRepo.find({
      where: {
        id_sala: idSala,
        estado_cola: 'EN_ESPERA',
      },
      relations: {
        estudiante: {
          carrera: true,
        },
      },
      order: {
        fecha_hora_llegada: 'ASC',
      },
    });

    const c = servidoresC > 0 ? servidoresC : 20;
    const mu = 1.0; // 1 sesión/hora promedio por máquina
    const minutosPorSalidaDePuesto = 60 / (c * mu);

    return cola.map((item, index) => {
      const posicion = index + 1;
      const tiempoEstimadoMin = Math.max(
        1,
        Math.round(posicion * minutosPorSalidaDePuesto * 10) / 10,
      );
      return {
        ...item,
        posicion,
        tiempo_espera_estimado_min: tiempoEstimadoMin,
      };
    });
  }

  async encolarEstudiante(
    dto: EncolarEstudianteDto,
    idUsuarioOperador: number,
    ip?: string,
  ) {
    const sala = await this.salaRepo.findOne({
      where: { id_sala: dto.id_sala },
    });
    if (!sala) {
      throw new NotFoundException(`La sala con ID ${dto.id_sala} no existe`);
    }

    const estudiante = await this.estudianteRepo.findOne({
      where: { registro: dto.registro_estudiante.trim() },
    });
    if (!estudiante) {
      throw new NotFoundException(
        `El estudiante con RU ${dto.registro_estudiante} no está registrado`,
      );
    }

    if (estudiante.sancionado) {
      throw new BadRequestException(
        `El estudiante presenta una sanción o investigación técnica pendiente: ${estudiante.motivo_sancion || 'Sin detalle'}`,
      );
    }

    // Verificar si ya tiene sesión activa
    const sesionActiva = await this.sesionRepo.findOne({
      where: {
        registro_estudiante: estudiante.registro,
        estado: 'EN_CURSO',
      },
    });
    if (sesionActiva) {
      throw new ConflictException(
        `El estudiante ya se encuentra ocupando un puesto en el laboratorio`,
      );
    }

    // Verificar si ya está en la cola de esta sala
    const enCola = await this.colaRepo.findOne({
      where: {
        id_sala: dto.id_sala,
        registro_estudiante: estudiante.registro,
        estado_cola: 'EN_ESPERA',
      },
    });
    if (enCola) {
      throw new ConflictException(
        `El estudiante ya se encuentra en la cola de espera de este laboratorio`,
      );
    }

    // Contar computadoras operativas (c) y cola actual
    const servidoresC = await this.computadoraRepo.count({
      where: {
        id_sala: dto.id_sala,
        activo: true,
        maquina_docente: false,
      },
    });

    const colaActual = await this.colaRepo.count({
      where: {
        id_sala: dto.id_sala,
        estado_cola: 'EN_ESPERA',
      },
    });

    const wqEstimado = this.calcularTiempoEsperaEstimado(
      servidoresC || 20,
      colaActual,
    );

    const nuevoTurno = this.colaRepo.create({
      id_sala: dto.id_sala,
      registro_estudiante: estudiante.registro,
      tiempo_espera_estimado_min: wqEstimado,
      estado_cola: 'EN_ESPERA',
    });

    const guardado = await this.colaRepo.save(nuevoTurno);

    await this.auditoriaService.registrar({
      id_usuario: idUsuarioOperador,
      accion: 'ENCOLAR_ESTUDIANTE_SALA',
      tabla_afectada: 'cola_espera_sala',
      id_registro_afectado: String(guardado.id_cola),
      valores_nuevos: {
        id_sala: dto.id_sala,
        registro: estudiante.registro,
        posicion: colaActual + 1,
        wq_estimado: wqEstimado,
      },
      ip_cliente: ip,
    });

    return guardado;
  }

  async atenderEstudiante(idCola: number) {
    const turno = await this.colaRepo.findOne({ where: { id_cola: idCola } });
    if (!turno) return null;

    const ahora = new Date();
    const minutosReales = Math.max(
      0,
      Math.round(
        ((ahora.getTime() - new Date(turno.fecha_hora_llegada).getTime()) /
          60000) *
          10,
      ) / 10,
    );

    turno.estado_cola = 'ATENDIDO';
    turno.fecha_hora_atencion = ahora;
    turno.tiempo_espera_real_min = minutosReales;

    return this.colaRepo.save(turno);
  }

  async cancelarTurno(idCola: number, idUsuarioOperador: number, ip?: string) {
    const turno = await this.colaRepo.findOne({ where: { id_cola: idCola } });
    if (!turno) {
      throw new NotFoundException(`Registro de cola #${idCola} no encontrado`);
    }

    turno.estado_cola = 'DESISTIO';
    const actualizado = await this.colaRepo.save(turno);

    await this.auditoriaService.registrar({
      id_usuario: idUsuarioOperador,
      accion: 'CANCELAR_TURNO_COLA',
      tabla_afectada: 'cola_espera_sala',
      id_registro_afectado: String(idCola),
      valores_nuevos: actualizado,
      ip_cliente: ip,
    });

    return actualizado;
  }
}
