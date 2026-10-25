import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { MantenimientoTaller } from './mantenimiento-taller.entity';

@Entity('confirmacion_retorno_sala')
export class ConfirmacionRetornoSala {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_retorno' })
  id_retorno: number;

  @Column({ name: 'id_mantenimiento', type: 'bigint', unique: true })
  id_mantenimiento: number;

  @OneToOne(
    () => MantenimientoTaller,
    (mantenimiento) => mantenimiento.confirmacion_retorno,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'id_mantenimiento' })
  mantenimiento: MantenimientoTaller;

  @Column({ name: 'id_usuario_confirma', type: 'bigint' })
  id_usuario_confirma: number;

  @ManyToOne(() => Usuario, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_usuario_confirma' })
  usuario_confirma: Usuario;

  @Column({ type: 'timestamp with time zone' })
  fecha_hora_retorno: Date;

  @Column({ type: 'boolean', default: true })
  pruebas_satisfactorias: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  obs_instalacion: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  creado_en: Date;
}
