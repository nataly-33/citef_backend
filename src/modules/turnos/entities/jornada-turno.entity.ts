import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { LaboratorioSala } from '../../infraestructura/entities/laboratorio-sala.entity';
import { AsignarTurno } from '../../catalogos/entities/asignar-turno.entity';
import { AveriaEquipo } from './averia-equipo.entity';
import { ObjetoExtraviado } from './objeto-extraviado.entity';
import { ActaRelevo } from './acta-relevo.entity';

export enum EstadoJornada {
  EN_CURSO = 'EN_CURSO',
  CERRADO_NORMAL = 'CERRADO_NORMAL',
  CERRADO_CON_NOVEDADES = 'CERRADO_CON_NOVEDADES',
  RELEVADO = 'RELEVADO',
}

export interface ChecklistApertura {
  luces: boolean;
  orden?: boolean;
  orden_limpieza?: boolean;
  aire?: boolean;
  aire_acondicionado?: boolean;
  proyector: boolean;
  pcs_encendidas?: any;
  observacion?: string | null;
  observaciones?: string | null;
  [key: string]: any;
}

export interface ChecklistCierre {
  luces_apagadas?: boolean;
  orden?: boolean;
  aire_apagado?: boolean;
  proyector_apagado?: boolean;
  pcs_apagadas?: boolean;
  observacion?: string;
  [key: string]: any;
}

@Entity('jornada_turno')
export class JornadaTurno {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_jornada' })
  id_jornada: number;

  @Column({ name: 'id_usuario_auxiliar', type: 'bigint' })
  id_usuario_auxiliar: number;

  @ManyToOne(() => Usuario, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_usuario_auxiliar' })
  auxiliar: Usuario;

  @Column({ name: 'id_sala', type: 'integer' })
  id_sala: number;

  @ManyToOne(() => LaboratorioSala, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_sala' })
  sala: LaboratorioSala;

  @Column({ name: 'id_asignar_turno', type: 'integer', nullable: true })
  id_asignar_turno: number | null;

  @ManyToOne(() => AsignarTurno, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'id_asignar_turno',
    referencedColumnName: 'id_asignacion_turno',
  })
  asignacion_turno: AsignarTurno | null;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'timestamp with time zone' })
  hora_apertura: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  hora_cierre: Date | null;

  @Column({ type: 'jsonb' })
  checklist_apertura: ChecklistApertura;

  @Column({ type: 'jsonb', nullable: true })
  checklist_cierre: ChecklistCierre | null;

  @Column({ type: 'integer', default: 0 })
  cant_estudiantes_atendidos: number;

  @Column({ type: 'integer', default: 0 })
  cant_averias_reportadas: number;

  @Column({ type: 'integer', default: 0 })
  cant_objetos_custodiados: number;

  @Column({ type: 'text', nullable: true })
  obs_cierre: string | null;

  @Column({
    type: 'varchar',
    length: 30,
    default: EstadoJornada.EN_CURSO,
  })
  estado: EstadoJornada;

  @OneToMany(() => ActaRelevo, (acta) => acta.jornada_saliente)
  actas_relevo: ActaRelevo[];

  @OneToMany(() => AveriaEquipo, (averia) => averia.jornada)
  averias: AveriaEquipo[];

  @OneToMany(() => ObjetoExtraviado, (obj) => obj.jornada_hallazgo)
  objetos: ObjetoExtraviado[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  creado_en: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  actualizado_en: Date;
}
