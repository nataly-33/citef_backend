import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { LaboratorioSala } from '../../infraestructura/entities/laboratorio-sala.entity';
import { JornadaTurno } from './jornada-turno.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Estudiante } from '../../ocupacion/entities/estudiante.entity';

export enum CategoriaObjeto {
  ELECTRONICA = 'ELECTRONICA',
  DOCUMENTO = 'DOCUMENTO',
  PRENDA = 'PRENDA',
  MATERIAL_ESTUDIO = 'MATERIAL_ESTUDIO',
  OTRO = 'OTRO',
}

export enum EstadoObjeto {
  BAJO_CUSTODIA = 'BAJO_CUSTODIA',
  DEVUELTO = 'DEVUELTO',
  DONADO_ARCHIVO = 'DONADO_ARCHIVO',
}

@Entity('objeto_extraviado')
export class ObjetoExtraviado {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_objeto' })
  id_objeto: number;

  @Column({ name: 'id_sala', type: 'integer' })
  id_sala: number;

  @ManyToOne(() => LaboratorioSala, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_sala' })
  sala: LaboratorioSala;

  @Column({ name: 'id_jornada_hallazgo', type: 'bigint', nullable: true })
  id_jornada_hallazgo: number | null;

  @ManyToOne(() => JornadaTurno, (j) => j.objetos, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'id_jornada_hallazgo' })
  jornada_hallazgo: JornadaTurno | null;

  @Column({ name: 'id_usuario_registro', type: 'bigint' })
  id_usuario_registro: number;

  @ManyToOne(() => Usuario, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_usuario_registro' })
  usuario_registro: Usuario;

  @Column({
    type: 'varchar',
    length: 40,
  })
  categoria: CategoriaObjeto;

  @Column({ type: 'varchar', length: 255 })
  descrip_detallada: string;

  @Column({ type: 'varchar', length: 100 })
  lugar_exacto: string;

  @Column({ type: 'timestamp with time zone' })
  fecha_hora_hallazgo: Date;

  @Column({
    type: 'varchar',
    length: 30,
    default: EstadoObjeto.BAJO_CUSTODIA,
  })
  estado: EstadoObjeto;

  @Column({
    name: 'registro_estudiante_receptor',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  registro_estudiante_receptor: string | null;

  @Column({
    name: 'nombre_estudiante_receptor',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  nombre_estudiante_receptor: string | null;

  @ManyToOne(() => Estudiante, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'registro_estudiante_receptor',
    referencedColumnName: 'registro',
  })
  estudiante_receptor: Estudiante | null;

  @Column({ name: 'id_usuario_entrega', type: 'bigint', nullable: true })
  id_usuario_entrega: number | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_usuario_entrega' })
  usuario_entrega: Usuario | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  fecha_hora_devolucion: Date | null;

  @Column({ type: 'text', nullable: true })
  obs_devolucion: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  creado_en: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  actualizado_en: Date;
}
