import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Materia } from './materia.entity';

@Entity('carrera')
export class Carrera {
  @PrimaryGeneratedColumn({ name: 'id_carrera' })
  id_carrera: number;

  @Column({ type: 'varchar', length: 20, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @OneToMany(() => Materia, (m) => m.carrera)
  materias: Materia[];

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  actualizado_en: Date;
}
