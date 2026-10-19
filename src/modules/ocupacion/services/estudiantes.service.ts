import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { Estudiante } from '../entities/estudiante.entity';
import { AsignacionSesion } from '../entities/asignacion-sesion.entity';
import { RegistrarEstudianteDto } from '../dto/registrar-estudiante.dto';
import { AuditoriaService } from '../../auditoria/auditoria.service';

@Injectable()
export class EstudiantesService {
  private readonly logger = new Logger(EstudiantesService.name);

  constructor(
    @InjectRepository(Estudiante)
    private readonly estudianteRepo: Repository<Estudiante>,
    @InjectRepository(AsignacionSesion)
    private readonly sesionRepo: Repository<AsignacionSesion>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async buscarPorRegistro(registro: string) {
    const estudiante = await this.estudianteRepo.findOne({
      where: { registro: registro.trim() },
      relations: { carrera: true },
    });

    if (!estudiante) {
      throw new NotFoundException(`No se encontró ningún estudiante con el registro ${registro}`);
    }

    // Verificar si tiene sesión activa
    const sesionActiva = await this.sesionRepo.findOne({
      where: {
        registro_estudiante: estudiante.registro,
        estado: 'EN_CURSO',
      },
      relations: {
        computadora: {
          sala: true,
        },
        motivo: true,
      },
    });

    return {
      estudiante,
      sesion_activa: sesionActiva || null,
      sancionado: estudiante.sancionado,
      motivo_sancion: estudiante.motivo_sancion,
    };
  }

  async autocompletar(termino: string) {
    if (!termino || termino.trim().length < 2) {
      return [];
    }

    const t = `%${termino.trim()}%`;
    return this.estudianteRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.carrera', 'c')
      .where('e.registro ILIKE :t', { t })
      .orWhere('e.ci ILIKE :t', { t })
      .orWhere('e.nombres ILIKE :t', { t })
      .orWhere('e.apellidos ILIKE :t', { t })
      .take(15)
      .getMany();
  }

  async registrarEstudiante(dto: RegistrarEstudianteDto, idUsuarioOperador: number, ip?: string) {
    const existente = await this.estudianteRepo.findOne({
      where: { registro: dto.registro.trim() },
    });

    if (existente) {
      throw new ConflictException(`Ya existe un estudiante registrado con el RU ${dto.registro}`);
    }

    const correoNormalizado =
      dto.correo && typeof dto.correo === 'string' && dto.correo.trim().length > 0
        ? dto.correo.trim().toLowerCase()
        : null;

    const nuevo = this.estudianteRepo.create({
      registro: dto.registro.trim(),
      ci: dto.ci.trim(),
      nombres: dto.nombres.trim().toUpperCase(),
      apellidos: dto.apellidos.trim().toUpperCase(),
      correo: correoNormalizado,
      id_carrera: Number(dto.id_carrera),
      sancionado: false,
      activo: true,
    });

    const guardado = await this.estudianteRepo.save(nuevo);

    await this.auditoriaService.registrar({
      id_usuario: idUsuarioOperador,
      accion: 'REGISTRAR_ESTUDIANTE',
      tabla_afectada: 'estudiante',
      id_registro_afectado: guardado.registro,
      valores_nuevos: guardado,
      ip_cliente: ip,
    });

    const estudianteConCarrera = await this.estudianteRepo.findOne({
      where: { registro: guardado.registro },
      relations: { carrera: true },
    });

    return estudianteConCarrera || guardado;
  }

  async alternarSancion(registro: string, sancionado: boolean, motivo: string | null, idUsuarioOperador: number, ip?: string) {
    const estudiante = await this.estudianteRepo.findOne({
      where: { registro: registro.trim() },
    });

    if (!estudiante) {
      throw new NotFoundException(`Estudiante ${registro} no encontrado`);
    }

    const valoresAnteriores = { ...estudiante };
    estudiante.sancionado = sancionado;
    estudiante.motivo_sancion = sancionado ? (motivo || 'Sanción disciplinaria u objeto extraviado pendiente') : null;

    const actualizado = await this.estudianteRepo.save(estudiante);

    await this.auditoriaService.registrar({
      id_usuario: idUsuarioOperador,
      accion: sancionado ? 'SANCIONAR_ESTUDIANTE' : 'LEVANTAR_SANCION_ESTUDIANTE',
      tabla_afectada: 'estudiante',
      id_registro_afectado: estudiante.registro,
      valores_anteriores: valoresAnteriores,
      valores_nuevos: actualizado,
      ip_cliente: ip,
    });

    return actualizado;
  }
}
