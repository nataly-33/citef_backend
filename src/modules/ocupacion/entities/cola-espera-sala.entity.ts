import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { LaboratorioSala } from '../../infraestructura/entities/laboratorio-sala.entity';
import { Estudiante } from './estudiante.entity';

@Entity('cola_espera_sala')
@Index('idx_cola_sala_estado', ['id_sala', 'estado_cola'])
export class ColaEsperaSala {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_cola' })
  id_cola: number;

  @Column({ type: 'integer' })
  id_sala: number;

  @ManyToOne(() => LaboratorioSala, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_sala' })
  sala: LaboratorioSala;

  @Column({ type: 'varchar', length: 20 })
  registro_estudiante: string;

  @ManyToOne(() => Estudiante, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'registro_estudiante' })
  estudiante: Estudiante;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  fecha_hora_llegada: Date;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0.0 })
  tiempo_espera_estimado_min: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  fecha_hora_atencion: Date | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  tiempo_espera_real_min: number | null;

  @Column({ type: 'varchar', length: 20, default: 'EN_ESPERA' })
  estado_cola: string; // 'EN_ESPERA' | 'ATENDIDO' | 'DESISTIO'
}
