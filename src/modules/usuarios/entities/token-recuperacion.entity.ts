import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Usuario } from './usuario.entity';

@Entity('token_recuperacion')
export class TokenRecuperacion {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id_token: number;

  @Column({ type: 'bigint' })
  id_usuario: number;

  @ManyToOne(() => Usuario, (usuario) => usuario.tokens_recuperacion, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;

  @Column({ type: 'varchar', length: 255, unique: true })
  token_hash: string;

  @Column({ type: 'timestamp with time zone' })
  expira_en: Date;

  @Column({ type: 'boolean', default: false })
  utilizado: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  creado_en: Date;
}
