import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('docente')
@Unique(['id_usuario'])
export class Docente {
  @PrimaryColumn({ type: 'varchar', length: 30 })
  codigo: string;

  @Column({ type: 'bigint', name: 'id_usuario' })
  id_usuario: number;

  @ManyToOne(() => Usuario, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;

  @Column({ type: 'varchar', length: 100, default: 'General' })
  departamento_academico: string;

  @Column({ type: 'varchar', length: 30, default: 'TITULAR' })
  condicion_contrato: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  actualizado_en: Date;
}
