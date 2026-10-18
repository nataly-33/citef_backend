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
import { Materia } from './materia.entity';

@Entity('carrera_materia')
@Unique(['id_carrera', 'id_materia'])
export class CarreraMateria {
  @PrimaryGeneratedColumn({ name: 'id_carrera_materia' })
  id_carrera_materia: number;

  @Column({ type: 'int', name: 'id_carrera' })
  id_carrera: number;

  @Column({ type: 'int', name: 'id_materia' })
  id_materia: number;

  @Column({ type: 'int', name: 'semestre_nivel' })
  semestre_nivel: number;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  actualizado_en: Date;

  @ManyToOne(() => Carrera, (c) => c.carreras_materias, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_carrera' })
  carrera: Carrera;

  @ManyToOne(() => Materia, (m) => m.carreras_materias, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_materia' })
  materia: Materia;
}
