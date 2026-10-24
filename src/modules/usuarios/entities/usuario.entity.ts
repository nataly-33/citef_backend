import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { Rol } from './rol.entity';
import { TokenRecuperacion } from './token-recuperacion.entity';
import { BitacoraAuditoria } from '../../auditoria/entities/bitacora-auditoria.entity';
import { LaboratorioSala } from '../../infraestructura/entities/laboratorio-sala.entity';
import { Computadora } from '../../infraestructura/entities/computadora.entity';
import { ReservaSala } from '../../reservas/entities/reserva-sala.entity';
import { AsignacionSesion } from '../../ocupacion/entities/asignacion-sesion.entity';
import { AsignarTurno } from '../../catalogos/entities/asignar-turno.entity';

@Entity('usuario')
export class Usuario {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id_usuario: number;

  @Column({ type: 'varchar', length: 120, unique: true })
  correo_institucional: string;

  @Column({ type: 'varchar', length: 255 })
  password_hash: string;

  @Column({ type: 'varchar', length: 80 })
  nombres: string;

  @Column({ type: 'varchar', length: 80 })
  apellidos: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefono: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  creado_en: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  actualizado_en: Date;

  @ManyToMany(() => Rol, { eager: true })
  @JoinTable({
    name: 'usuario_rol',
    joinColumn: { name: 'id_usuario', referencedColumnName: 'id_usuario' },
    inverseJoinColumn: { name: 'id_rol', referencedColumnName: 'id_rol' },
  })
  roles: Rol[];

  @OneToMany(() => TokenRecuperacion, (token) => token.usuario)
  tokens_recuperacion: TokenRecuperacion[];

  @OneToMany(() => BitacoraAuditoria, (audit) => audit.usuario)
  auditorias: BitacoraAuditoria[];

  @OneToMany(() => LaboratorioSala, (sala) => sala.administrador)
  salas_administradas: LaboratorioSala[];

  @OneToMany(() => Computadora, (pc) => pc.administrador)
  computadoras_inventariadas: Computadora[];

  @OneToMany(() => ReservaSala, (res) => res.administrador)
  reservas_administradas: ReservaSala[];

  @OneToMany(() => AsignacionSesion, (ses) => ses.auxiliar)
  sesiones_auxiliar: AsignacionSesion[];

  @OneToMany(() => AsignarTurno, (t) => t.usuario)
  turnos_guardia: AsignarTurno[];
}
