import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Computadora } from '../../infraestructura/entities/computadora.entity';
import { LaboratorioSala } from '../../infraestructura/entities/laboratorio-sala.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Estudiante } from '../../ocupacion/entities/estudiante.entity';
import { ReservaSala } from '../../reservas/entities/reserva-sala.entity';
import { JornadaTurno } from './jornada-turno.entity';

export enum TipoFalla {
  HARDWARE = 'HARDWARE',
  SOFTWARE = 'SOFTWARE',
  RED = 'RED',
  PERIFERICO = 'PERIFERICO',
}

export enum GravedadAveria {
  BAJA = 'BAJA',
  MEDIA = 'MEDIA',
  CRITICA = 'CRITICA',
}

export enum EstadoAveria {
  PENDIENTE_REVISION = 'PENDIENTE_REVISION',
  EN_TALLER = 'EN_TALLER',
  REPARADO = 'REPARADO',
  DESCARTADO = 'DESCARTADO',
}

@Entity('averia_equipo')
export class AveriaEquipo {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_averia' })
  id_averia: number;

  @Column({ name: 'id_computadora', type: 'bigint' })
  id_computadora: number;

  @ManyToOne(() => Computadora, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_computadora' })
  computadora: Computadora;

  @Column({ name: 'id_sala', type: 'integer' })
  id_sala: number;

  @ManyToOne(() => LaboratorioSala, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_sala' })
  sala: LaboratorioSala;

  @Column({ name: 'id_usuario_reporta', type: 'bigint' })
  id_usuario_reporta: number;

  @ManyToOne(() => Usuario, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_usuario_reporta' })
  usuario_reporta: Usuario;

  @Column({
    name: 'registro_ultimo_estudiante',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  registro_ultimo_estudiante: string | null;

  @ManyToOne(() => Estudiante, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'registro_ultimo_estudiante',
    referencedColumnName: 'registro',
  })
  ultimo_estudiante: Estudiante | null;

  @Column({ name: 'id_reserva', type: 'integer', nullable: true })
  id_reserva: number | null;

  @ManyToOne(() => ReservaSala, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_reserva' })
  reserva: ReservaSala | null;

  @Column({ name: 'id_jornada', type: 'bigint', nullable: true })
  id_jornada: number | null;

  @ManyToOne(() => JornadaTurno, (j) => j.averias, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'id_jornada' })
  jornada: JornadaTurno | null;

  @Column({
    type: 'varchar',
    length: 30,
  })
  tipo_falla: TipoFalla;

  @Column({ type: 'text' })
  descrip_falla: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: GravedadAveria.MEDIA,
  })
  gravedad: GravedadAveria;

  @Column({
    type: 'varchar',
    length: 30,
    default: EstadoAveria.PENDIENTE_REVISION,
  })
  estado: EstadoAveria;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  fecha_reporte: Date;

  @Column({ type: 'text', nullable: true })
  solucion_tecnica: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  fecha_solucion: Date | null;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  actualizado_en: Date;
}
