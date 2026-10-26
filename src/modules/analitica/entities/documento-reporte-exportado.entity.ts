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

export enum CodigoReporteOficial {
  REP_CATEDRAS = 'REP_CATEDRAS',
  REP_OCUPACION = 'REP_OCUPACION',
  REP_RAMS = 'REP_RAMS',
  REP_EVALUACIONES = 'REP_EVALUACIONES',
  REP_AUDITORIA = 'REP_AUDITORIA',
}

export enum FormatoReporte {
  EXCEL = 'EXCEL',
  PDF = 'PDF',
}

@Entity('documento_reporte_exportado')
@Index(['codigo_reporte', 'fecha_generacion'])
export class DocumentoReporteExportado {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_documento' })
  id_documento: number;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'codigo_reporte',
  })
  codigo_reporte: string; // 'REP_CATEDRAS' | 'REP_OCUPACION' | 'REP_RAMS' | 'REP_EVALUACIONES' | 'REP_AUDITORIA'

  @Column({ type: 'varchar', length: 150, name: 'nombre_reporte' })
  nombre_reporte: string;

  @Column({ type: 'varchar', length: 10, name: 'formato' })
  formato: string; // 'EXCEL' | 'PDF'

  @Column({ type: 'jsonb', name: 'parametros_filtro', nullable: true })
  parametros_filtro: Record<string, any> | null;

  @Column({ type: 'varchar', length: 64, name: 'hash_sha256' })
  hash_sha256: string;

  @Column({ name: 'id_usuario_generador', type: 'bigint', nullable: true })
  id_usuario_generador: number | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_usuario_generador' })
  usuario_generador: Usuario | null;

  @CreateDateColumn({
    name: 'fecha_generacion',
    type: 'timestamp with time zone',
  })
  fecha_generacion: Date;
}
