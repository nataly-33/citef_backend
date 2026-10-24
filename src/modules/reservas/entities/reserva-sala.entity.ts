import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { LaboratorioSala } from '../../infraestructura/entities/laboratorio-sala.entity';
import { Docente } from '../../catalogos/entities/docente.entity';
import { Materia } from '../../catalogos/entities/materia.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum EstadoReserva {
  PENDIENTE = 'PENDIENTE',
  APROBADA = 'APROBADA',
  EN_CURSO = 'EN_CURSO',
  RECHAZADA = 'RECHAZADA',
  CANCELADA = 'CANCELADA',
  FINALIZADA = 'FINALIZADA',
}

export enum TipoReserva {
  CLASE = 'CLASE',
  EXAMEN = 'EXAMEN',
}

@Entity('reserva_sala')
@Index(['id_sala', 'fecha_reserva', 'estado'])
@Index(['codigo_docente'])
export class ReservaSala {
  @PrimaryGeneratedColumn({ name: 'id_reserva' })
  id_reserva: number;

  @Column({ name: 'id_sala', type: 'integer' })
  id_sala: number;

  @ManyToOne(() => LaboratorioSala, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_sala' })
  sala: LaboratorioSala;

  @Column({ name: 'codigo_docente', type: 'varchar', length: 30 })
  codigo_docente: string;

  @ManyToOne(() => Docente, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'codigo_docente' })
  docente: Docente;

  @Column({ name: 'id_materia', type: 'integer' })
  id_materia: number;

  @ManyToOne(() => Materia, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_materia' })
  materia: Materia;

  @Column({ name: 'id_usuario_administrador', type: 'bigint', nullable: true })
  id_usuario_administrador: number | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_usuario_administrador' })
  administrador: Usuario | null;

  @Column({ name: 'fecha_reserva', type: 'date' })
  fecha_reserva: string;

  @Column({ name: 'hora_inicio', type: 'time' })
  hora_inicio: string;

  @Column({ name: 'hora_fin', type: 'time' })
  hora_fin: string;

  @Column({ name: 'tema_practica', type: 'varchar', length: 150 })
  tema_practica: string;

  @Column({ name: 'cant_estimada_alumnos', type: 'smallint' })
  cant_estimada_alumnos: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: TipoReserva.CLASE,
    name: 'tipo_reserva',
  })
  tipo_reserva: TipoReserva;

  @Column({
    type: 'varchar',
    length: 20,
    default: EstadoReserva.PENDIENTE,
  })
  estado: EstadoReserva;

  @Column({ type: 'boolean', default: false, name: 'editada' })
  editada: boolean;

  @Column({ type: 'text', nullable: true, name: 'notificacion_docente' })
  notificacion_docente: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'id_lote_recurrente' })
  id_lote_recurrente: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'id_grupo_multisala' })
  id_grupo_multisala: string | null;

  @Column({ type: 'smallint', nullable: true, name: 'cant_total_alumnos' })
  cant_total_alumnos: number | null;

  @Column({ type: 'jsonb', nullable: true, name: 'salas_grupo' })
  salas_grupo: Array<{
    id_sala: number;
    codigo_sala: string;
    nombre: string;
    capacidad: number;
    cant_asignada: number;
  }> | null;

  @Column({ name: 'obs_resolucion', type: 'text', nullable: true })
  obs_resolucion: string | null;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamp with time zone' })
  creado_en: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamp with time zone' })
  actualizado_en: Date;
}
