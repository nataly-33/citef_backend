import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('motivo_uso')
export class MotivoUso {
  @PrimaryGeneratedColumn({ name: 'id_motivo' })
  id_motivo: number;

  @Column({ type: 'varchar', length: 100 })
  descrip: string;

  @Column({ type: 'varchar', length: 30 })
  tipo: string; // 'ACADEMICO', 'LIBRE', 'ADMINISTRATIVO'

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;
}
