import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from 'typeorm';
import { LaboratorioSala } from './laboratorio-sala.entity';
import { PerifericoInventario } from './periferico-inventario.entity';

@Entity('computadora')
@Unique('uq_sala_posicion', ['id_sala', 'posicion_fila', 'posicion_columna'])
export class Computadora {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_computadora' })
  id_computadora: number;

  @Column({ type: 'integer' })
  id_sala: number;

  @ManyToOne(() => LaboratorioSala, (s) => s.computadoras, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_sala' })
  sala: LaboratorioSala;

  @Column({ type: 'varchar', length: 30, unique: true })
  codigo_equipo: string;

  @Column({ type: 'boolean', default: false })
  maquina_docente: boolean;

  @Column({ type: 'smallint' })
  posicion_fila: number;

  @Column({ type: 'smallint' })
  posicion_columna: number;

  @Column({ type: 'varchar', length: 25, default: 'DISPONIBLE' })
  estado_actual: string; // 'DISPONIBLE' | 'OCUPADA' | 'RESERVADA' | 'EN_MANTENIMIENTO'

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_red: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  mac_address: string | null;

  @Column({ type: 'numeric', precision: 8, scale: 2, default: 0.0 })
  horas_uso_acumuladas: number;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @OneToMany(() => PerifericoInventario, (p) => p.computadora)
  perifericos: PerifericoInventario[];

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  actualizado_en: Date;
}
