import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Carrera } from '../../catalogos/entities/carrera.entity';
import { AsignacionSesion } from './asignacion-sesion.entity';

@Entity('estudiante')
export class Estudiante {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  registro: string; // RU matrícula universitaria única (PK natural)

  @Column({ type: 'varchar', length: 20 })
  ci: string;

  @Column({ type: 'varchar', length: 80 })
  nombres: string;

  @Column({ type: 'varchar', length: 80 })
  apellidos: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  correo: string | null;

  @Column({ type: 'integer' })
  id_carrera: number;

  @ManyToOne(() => Carrera, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_carrera' })
  carrera: Carrera;

  @Column({ type: 'boolean', default: false })
  sancionado: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  motivo_sancion: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @OneToMany(() => AsignacionSesion, (s) => s.estudiante)
  sesiones: AsignacionSesion[];

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  actualizado_en: Date;
}
