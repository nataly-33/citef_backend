import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Computadora } from './computadora.entity';
import { TipoPeriferico } from './tipo-periferico.entity';

@Entity('periferico_inventario')
export class PerifericoInventario {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_periferico' })
  id_periferico: number;

  @Column({ type: 'bigint', nullable: true })
  id_computadora: number | null;

  @ManyToOne(() => Computadora, (c) => c.perifericos, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'id_computadora' })
  computadora: Computadora | null;

  @Column({ type: 'integer' })
  id_tipo_periferico: number;

  @ManyToOne(() => TipoPeriferico, (tp) => tp.perifericos, { eager: true })
  @JoinColumn({ name: 'id_tipo_periferico' })
  tipo: TipoPeriferico;

  @Column({ type: 'varchar', length: 80 })
  marca_modelo: string;

  @Column({ type: 'varchar', length: 60, nullable: true, unique: true })
  numero_serie: string | null;

  @Column({ type: 'varchar', length: 20, default: 'BUENO' })
  condicion_fisica: string; // 'BUENO' | 'REGULAR' | 'DANADO' | 'FALTANTE'

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @UpdateDateColumn({ type: 'timestamp' })
  actualizado_en: Date;

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;
}
