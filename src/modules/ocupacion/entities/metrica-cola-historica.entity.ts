import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { LaboratorioSala } from '../../infraestructura/entities/laboratorio-sala.entity';

@Entity('metrica_cola_historica')
export class MetricaColaHistorica {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_metrica_cola' })
  id_metrica_cola: number;

  @Column({ type: 'integer' })
  id_sala: number;

  @ManyToOne(() => LaboratorioSala, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_sala' })
  sala: LaboratorioSala;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'varchar', length: 15 })
  turno: string; // 'MANANA' | 'TARDE' | 'NOCHE'

  @Column({ type: 'numeric', precision: 6, scale: 2 })
  lambda_llegadas_hora: number;

  @Column({ type: 'numeric', precision: 6, scale: 2 })
  mu_servicio_hora: number;

  @Column({ type: 'smallint' })
  servidores_c: number;

  @Column({ type: 'numeric', precision: 5, scale: 4 })
  factor_utilizacion_rho: number;

  @Column({ type: 'numeric', precision: 6, scale: 2 })
  tiempo_medio_espera_wq: number;

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;
}
