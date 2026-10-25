import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Computadora } from '../../infraestructura/entities/computadora.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { AveriaEquipo } from '../../turnos/entities/averia-equipo.entity';
import { ConfirmacionRetornoSala } from './confirmacion-retorno.entity';

export enum EstadoMantenimiento {
  PENDIENTE_TALLER = 'PENDIENTE_TALLER',
  EN_REPARACION = 'EN_REPARACION',
  REPARADO_EN_TALLER = 'REPARADO_EN_TALLER',
  RETORNADO_A_SALA = 'RETORNADO_A_SALA',
  BAJA_DEFINITIVA = 'BAJA_DEFINITIVA',
}

export enum TipoMantenimiento {
  CORRECTIVO = 'CORRECTIVO',
  PREVENTIVO = 'PREVENTIVO',
}

export enum PrioridadMantenimiento {
  BAJA = 'BAJA',
  MEDIA = 'MEDIA',
  ALTA = 'ALTA',
  CRITICA = 'CRITICA',
}

@Entity('mantenimiento_taller')
export class MantenimientoTaller {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_mantenimiento' })
  id_mantenimiento: number;

  @Column({ name: 'id_averia', type: 'bigint', nullable: true })
  id_averia: number | null;

  @ManyToOne(() => AveriaEquipo, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_averia' })
  averia: AveriaEquipo | null;

  @Column({ name: 'id_computadora', type: 'bigint' })
  id_computadora: number;

  @ManyToOne(() => Computadora, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_computadora' })
  computadora: Computadora;

  @Column({ name: 'id_usuario_tecnico', type: 'bigint', nullable: true })
  id_usuario_tecnico: number | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_usuario_tecnico' })
  tecnico: Usuario | null;

  @Column({ name: 'id_usuario_administrador', type: 'bigint', nullable: true })
  id_usuario_administrador: number | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_usuario_administrador' })
  administrador: Usuario | null;

  @Column({
    type: 'varchar',
    length: 30,
    default: EstadoMantenimiento.PENDIENTE_TALLER,
  })
  estado: EstadoMantenimiento;

  @Column({
    type: 'varchar',
    length: 30,
    default: TipoMantenimiento.CORRECTIVO,
  })
  tipo_mantenimiento: TipoMantenimiento;

  @Column({
    type: 'varchar',
    length: 20,
    default: PrioridadMantenimiento.MEDIA,
  })
  prioridad: PrioridadMantenimiento;

  @Column({ type: 'text', nullable: true })
  descripcion_problema: string | null;

  @Column({ type: 'text', nullable: true })
  diagnostico_tecnico: string | null;

  @Column({ type: 'text', nullable: true })
  solucion_aplicada: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  repuestos_utilizados: string | null;

  @Column({
    type: 'numeric',
    precision: 8,
    scale: 2,
    nullable: true,
    transformer: {
      to: (v: number | null) => v,
      from: (v: string | null) => (v !== null ? parseFloat(v) : null),
    },
  })
  duracion_taller_horas: number | null;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: {
      to: (v: number | null) => v,
      from: (v: string | null) => (v !== null ? parseFloat(v) : null),
    },
  })
  costo_reparacion: number | null;

  @Column({ type: 'text', nullable: true })
  motivo_baja: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  fecha_hora_ingreso: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  fecha_hora_inicio_taller: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  fecha_hora_fin_taller: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  creado_en: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  actualizado_en: Date;

  @OneToOne(() => ConfirmacionRetornoSala, (retorno) => retorno.mantenimiento, {
    cascade: true,
  })
  confirmacion_retorno: ConfirmacionRetornoSala | null;
}
