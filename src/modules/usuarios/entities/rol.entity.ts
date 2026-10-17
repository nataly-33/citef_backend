import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Permiso } from './permiso.entity';

@Entity('rol')
export class Rol {
  @PrimaryGeneratedColumn({ type: 'int' })
  id_rol: number;

  @Column({ type: 'varchar', length: 40, unique: true })
  nombre: string;

  @Column({ type: 'varchar', length: 255 })
  descrip: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @ManyToMany(() => Permiso, { eager: true, cascade: true })
  @JoinTable({
    name: 'rol_permiso',
    joinColumn: { name: 'id_rol', referencedColumnName: 'id_rol' },
    inverseJoinColumn: { name: 'id_permiso', referencedColumnName: 'id_permiso' },
  })
  permisos: Permiso[];
}
