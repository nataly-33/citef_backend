import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { CarreraMateria } from './carrera-materia.entity';

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

  @OneToMany(() => CarreraMateria, (cm) => cm.carrera)
  carreras_materias: CarreraMateria[];

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  actualizado_en: Date;
}
