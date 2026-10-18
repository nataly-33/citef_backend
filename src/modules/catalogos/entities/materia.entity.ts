import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Carrera } from './carrera.entity';

@Entity('materia')
@Unique(['sigla', 'id_carrera'])
export class Materia {
  @PrimaryGeneratedColumn({ name: 'id_materia' })
  id_materia: number;

  @Column({ type: 'varchar', length: 20 })
  sigla: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'int', name: 'semestre_nivel' })
  semestre_nivel: number;

  @Column({ type: 'int', name: 'id_carrera' })
  id_carrera: number;

  @ManyToOne(() => Carrera, (c) => c.materias, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_carrera' })
  carrera: Carrera;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  actualizado_en: Date;
}
