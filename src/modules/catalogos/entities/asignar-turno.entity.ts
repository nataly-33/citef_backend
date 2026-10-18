import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { HorarioOperativo } from './horario-operativo.entity';

@Entity('asignar_turno')
export class AsignarTurno {
  @PrimaryGeneratedColumn({ name: 'id_asignacion_turno' })
  id_asignacion_turno: number;

  @Column({ type: 'int', name: 'id_usuario' })
  id_usuario: number;

  @ManyToOne(() => Usuario, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;

  @Column({ type: 'int', name: 'id_horario' })
  id_horario: number;

  @ManyToOne(() => HorarioOperativo, (h) => h.asignaciones, {
    eager: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'id_horario' })
  horario: HorarioOperativo;

  @Column({ type: 'varchar', length: 20 })
  semestre: string; // ej: '1-2026'

  @Column({ type: 'date' })
  fecha_inicio: string;

  @Column({ type: 'date' })
  fecha_fin: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;
}
