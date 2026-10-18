import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Unique,
} from 'typeorm';
import { CarreraMateria } from './carrera-materia.entity';

@Entity('materia')
@Unique(['sigla'])
export class Materia {
  @PrimaryGeneratedColumn({ name: 'id_materia' })
  id_materia: number;

  @Column({ type: 'varchar', length: 20 })
  sigla: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  actualizado_en: Date;

  @OneToMany(() => CarreraMateria, (cm) => cm.materia, { cascade: true })
  carreras_materias: CarreraMateria[];
}
