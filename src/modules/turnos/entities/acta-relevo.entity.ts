import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { JornadaTurno } from './jornada-turno.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('acta_relevo')
export class ActaRelevo {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_acta_relevo' })
  id_acta_relevo: number;

  @Column({ name: 'id_jornada_saliente', type: 'bigint' })
  id_jornada_saliente: number;

  @ManyToOne(() => JornadaTurno, (j) => j.actas_relevo, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_jornada_saliente' })
  jornada_saliente: JornadaTurno;

  @Column({ name: 'id_usuario_saliente', type: 'bigint' })
  id_usuario_saliente: number;

  @ManyToOne(() => Usuario, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_usuario_saliente' })
  usuario_saliente: Usuario;

  @Column({ name: 'id_usuario_entrante', type: 'bigint', nullable: true })
  id_usuario_entrante: number | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_usuario_entrante' })
  usuario_entrante: Usuario | null;

  @Column({ type: 'timestamp with time zone' })
  fecha_hora_relevo: Date;

  @Column({ type: 'integer' })
  cant_equipos_operativos: number;

  @Column({ type: 'integer' })
  cant_averias_pend: number;

  @Column({ type: 'integer' })
  cant_objetos_custodia: number;

  @Column({ type: 'text', nullable: true })
  novedades: string | null;

  @Column({ type: 'boolean', default: false })
  aceptado_por_entrante: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  fecha_hora_conformidad: Date | null;

  @Column({ type: 'text', nullable: true })
  obs_discrepancia: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  creado_en: Date;
}
