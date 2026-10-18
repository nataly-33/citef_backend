import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { PerifericoInventario } from './periferico-inventario.entity';

@Entity('tipo_periferico')
export class TipoPeriferico {
  @PrimaryGeneratedColumn({ name: 'id_tipo_periferico' })
  id_tipo_periferico: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  nombre: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @OneToMany(() => PerifericoInventario, (pi) => pi.tipo)
  perifericos: PerifericoInventario[];

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  actualizado_en: Date;
}
