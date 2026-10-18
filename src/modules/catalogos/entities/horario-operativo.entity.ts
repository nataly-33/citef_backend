import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { AsignarTurno } from './asignar-turno.entity';

@Entity('horario_operativo')
export class HorarioOperativo {
  @PrimaryGeneratedColumn({ name: 'id_horario' })
  id_horario: number;

  @Column({ type: 'varchar', length: 20 })
  turno: string; // 'MAÑANA', 'TARDE', 'NOCHE'

  @Column({ type: 'varchar', length: 8 })
  hora_inicio: string; // '07:00:00'

  @Column({ type: 'varchar', length: 8 })
  hora_fin: string; // '12:00:00'

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @OneToMany(() => AsignarTurno, (a) => a.horario)
  asignaciones: AsignarTurno[];

  @CreateDateColumn({ type: 'timestamp' })
  creado_en: Date;
}
