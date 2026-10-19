import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Computadora } from '../../infraestructura/entities/computadora.entity';
import { Estudiante } from './estudiante.entity';
import { MotivoUso } from '../../catalogos/entities/motivo-uso.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('asignacion_sesion')
@Index('idx_sesion_estudiante_activa', ['registro_estudiante', 'estado'])
@Index('idx_sesion_computadora_activa', ['id_computadora', 'estado'])
export class AsignacionSesion {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_asignacion' })
  id_asignacion: number;

  @Column({ type: 'bigint' })
  id_computadora: number;

  @ManyToOne(() => Computadora, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_computadora' })
  computadora: Computadora;

  @Column({ type: 'varchar', length: 20 })
  registro_estudiante: string;

  @ManyToOne(() => Estudiante, (e) => e.sesiones, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'registro_estudiante' })
  estudiante: Estudiante;

  @Column({ type: 'integer' })
  id_motivo: number;

  @ManyToOne(() => MotivoUso, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_motivo' })
  motivo: MotivoUso;

  @Column({ type: 'bigint' })
  id_usuario_auxiliar: number;

  @ManyToOne(() => Usuario, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_usuario_auxiliar' })
  auxiliar: Usuario;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  fecha_hora_inicio: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  fecha_hora_fin: Date | null;

  @Column({ type: 'integer', nullable: true })
  minutos_permanencia: number | null;

  @Column({ type: 'boolean', default: false })
  asignacion_automatica: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  observaciones: string | null;

  @Column({ type: 'varchar', length: 20, default: 'EN_CURSO' })
  estado: string; // 'EN_CURSO' | 'CONCLUIDA' | 'CANCELADA'
}
