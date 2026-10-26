import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { LaboratorioSala } from '../../infraestructura/entities/laboratorio-sala.entity';

export enum TipoOperacionMl {
  PREDICCION_DEMANDA = 'PREDICCION_DEMANDA',
  SIMULACION_COLAS_MMC = 'SIMULACION_COLAS_MMC',
}

@Entity('ejecucion_ml')
@Index(['tipo_operacion', 'fecha_ejecucion'])
export class EjecucionMl {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_ejecucion' })
  id_ejecucion: number;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'tipo_operacion',
  })
  tipo_operacion: string; // 'PREDICCION_DEMANDA' | 'SIMULACION_COLAS_MMC'

  @Column({ name: 'id_sala', type: 'integer', nullable: true })
  id_sala: number | null;

  @ManyToOne(() => LaboratorioSala, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_sala' })
  sala: LaboratorioSala | null;

  @Column({ type: 'jsonb', name: 'parametros_entrada' })
  parametros_entrada: Record<string, any>;

  @Column({ type: 'jsonb', name: 'resultado_salida' })
  resultado_salida: Record<string, any>;

  @Column({ name: 'id_usuario', type: 'bigint', nullable: true })
  id_usuario: number | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario | null;

  @CreateDateColumn({
    name: 'fecha_ejecucion',
    type: 'timestamp with time zone',
  })
  fecha_ejecucion: Date;

  @Column({ name: 'tiempo_respuesta_ms', type: 'integer', default: 0 })
  tiempo_respuesta_ms: number;
}
