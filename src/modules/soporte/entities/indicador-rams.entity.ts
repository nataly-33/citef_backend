import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Computadora } from '../../infraestructura/entities/computadora.entity';
import { LaboratorioSala } from '../../infraestructura/entities/laboratorio-sala.entity';

const numericTransformer = {
  to: (v: number | null) => v,
  from: (v: string | null) => (v !== null ? parseFloat(v) : null),
};

@Entity('indicador_confiabilidad_rams')
@Unique('uq_rams_pc_periodo', ['id_computadora', 'periodo_mes', 'periodo_anio'])
export class IndicadorConfiabilidadRAMS {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_indicador' })
  id_indicador: number;

  @Column({ name: 'id_computadora', type: 'bigint' })
  id_computadora: number;

  @ManyToOne(() => Computadora, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_computadora' })
  computadora: Computadora;

  @Column({ name: 'id_sala', type: 'integer' })
  id_sala: number;

  @ManyToOne(() => LaboratorioSala, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_sala' })
  sala: LaboratorioSala;

  @Column({ type: 'smallint' })
  periodo_mes: number;

  @Column({ type: 'smallint' })
  periodo_anio: number;

  @Column({ type: 'smallint', default: 0 })
  cant_fallas_registradas: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  horas_operativas_totales: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  horas_parada_totales: number;

  @Column({
    type: 'numeric',
    precision: 8,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  mtbf_horas: number;

  @Column({
    type: 'numeric',
    precision: 8,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  mttr_horas: number;

  @Column({
    type: 'numeric',
    precision: 6,
    scale: 4,
    default: 1.0,
    transformer: numericTransformer,
  })
  disponibilidad_operativa_a: number;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  calculado_en: Date;
}
