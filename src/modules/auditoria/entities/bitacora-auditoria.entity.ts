import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('bitacora_auditoria')
export class BitacoraAuditoria {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id_auditoria: number;

  @Column({ type: 'bigint', nullable: true })
  id_usuario: number | null;

  @ManyToOne(() => Usuario, (usuario) => usuario.auditorias, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  correo_usuario: string | null;

  @Column({ type: 'varchar', length: 50 })
  accion: string; // INSERT, UPDATE, DELETE, LOGIN, RESET_PASSWORD, etc.

  @Column({ type: 'varchar', length: 60 })
  tabla_afectada: string;

  @Column({ type: 'varchar', length: 60 })
  id_registro_afectado: string;

  @Column({ type: 'jsonb', nullable: true })
  valores_anteriores: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  valores_nuevos: Record<string, any> | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_cliente: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  fecha_hora: Date;
}
