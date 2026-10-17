import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('permiso')
export class Permiso {
  @PrimaryGeneratedColumn({ type: 'int' })
  id_permiso: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 50 })
  modulo: string;

  @Column({ type: 'varchar', length: 255 })
  descrip: string;
}
