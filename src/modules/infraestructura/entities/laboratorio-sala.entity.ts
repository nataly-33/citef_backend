import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Computadora } from './computadora.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('laboratorio_sala')
export class LaboratorioSala {
  @PrimaryGeneratedColumn({ name: 'id_sala' })
  id_sala: number;

  @Column({ name: 'id_usuario_administrador', type: 'bigint', nullable: true })
  id_usuario_administrador: number | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_usuario_administrador' })
  administrador: Usuario | null;

  @Column({ type: 'varchar', length: 20, unique: true })
  codigo_sala: string;

  @Column({ type: 'varchar', length: 80 })
  nombre: string;

  @Column({ type: 'smallint' })
  piso: number;

  @Column({ type: 'smallint', default: 24 })
  cant_estudiantes: number;

  @Column({ type: 'boolean', default: true })
  maquina_docente: boolean;

  @Column({ type: 'boolean', default: true })
  proyector: boolean;

  @Column({ type: 'boolean', default: true })
  aire_acondicionado: boolean;

  @Column({ type: 'smallint', default: 6 })
  filas_cuadricula: number;

  @Column({ type: 'smallint', default: 8 })
  columnas_cuadricula: number;

  @Column({ type: 'varchar', length: 25, default: 'OPERATIVA' })
  estado_operativo: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @OneToMany(() => Computadora, (c) => c.sala)
  computadoras: Computadora[];

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  actualizado_en: Date;
}
