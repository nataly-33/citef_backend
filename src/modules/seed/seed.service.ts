import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Rol } from '../usuarios/entities/rol.entity';
import { Permiso } from '../usuarios/entities/permiso.entity';
import { Carrera } from '../catalogos/entities/carrera.entity';
import { Materia } from '../catalogos/entities/materia.entity';
import { HorarioOperativo } from '../catalogos/entities/horario-operativo.entity';
import { MotivoUso } from '../catalogos/entities/motivo-uso.entity';
import { Docente } from '../catalogos/entities/docente.entity';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Rol)
    private readonly rolRepo: Repository<Rol>,
    @InjectRepository(Permiso)
    private readonly permisoRepo: Repository<Permiso>,
    @InjectRepository(Carrera)
    private readonly carreraRepo: Repository<Carrera>,
    @InjectRepository(Materia)
    private readonly materiaRepo: Repository<Materia>,
    @InjectRepository(HorarioOperativo)
    private readonly horarioRepo: Repository<HorarioOperativo>,
    @InjectRepository(MotivoUso)
    private readonly motivoRepo: Repository<MotivoUso>,
    @InjectRepository(Docente)
    private readonly docenteRepo: Repository<Docente>,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Verificando inicialización de datos base (Seeder)...');
    await this.seedPermisos();
    await this.seedRoles();
    await this.seedUsuarios();
    await this.seedCarreras();
    await this.seedMaterias();
    await this.seedHorarios();
    await this.seedMotivos();
    await this.seedDocentes();
    this.logger.log('Inicialización de datos completada exitosamente.');
  }

  private async seedPermisos() {
    const catalogoPermisos = [
      // Módulo 1: Seguridad y Acceso
      { codigo: 'SEG_USUARIOS_VER', modulo: 'Seguridad', descrip: 'Consultar listado de usuarios' },
      { codigo: 'SEG_USUARIOS_CREAR', modulo: 'Seguridad', descrip: 'Crear nuevos usuarios institucionales' },
      { codigo: 'SEG_USUARIOS_EDITAR', modulo: 'Seguridad', descrip: 'Modificar y cambiar estado de usuarios' },
      { codigo: 'SEG_ROLES_GESTIONAR', modulo: 'Seguridad', descrip: 'Crear roles y administrar matriz RBAC' },
      { codigo: 'SEG_AUDITORIA_VER', modulo: 'Seguridad', descrip: 'Visualizar bitácora de auditoría' },

      // Módulo 2: Catálogos y Parámetros
      { codigo: 'CAT_ACADEMICOS_GESTIONAR', modulo: 'Catálogos', descrip: 'Gestionar carreras, semestres y materias' },
      { codigo: 'CAT_HORARIOS_GESTIONAR', modulo: 'Catálogos', descrip: 'Gestionar motivos y horarios operativos' },
      { codigo: 'CAT_IMPORTAR_DOCENTES', modulo: 'Catálogos', descrip: 'Carga masiva de docentes por Excel/CSV' },
      { codigo: 'CAT_ASIGNAR_TURNOS', modulo: 'Catálogos', descrip: 'Asignar horarios semestrales a auxiliares' },

      // Módulo 3: Infraestructura y Recursos
      { codigo: 'INFRA_LABS_GESTIONAR', modulo: 'Infraestructura', descrip: 'Gestionar laboratorios' },
      { codigo: 'INFRA_SALAS_CONFIGURAR', modulo: 'Infraestructura', descrip: 'Configurar cuadrícula y planos de sala' },
      { codigo: 'INFRA_INVENTARIO_GESTIONAR', modulo: 'Infraestructura', descrip: 'Controlar inventario de periféricos' },

      // Módulo 4: Ocupación en Tiempo Real
      { codigo: 'TIEMPOREAL_MONITOREAR', modulo: 'Ocupación', descrip: 'Monitorear dashboard síncrono de salas' },
      { codigo: 'TIEMPOREAL_ASIGNAR', modulo: 'Ocupación', descrip: 'Asignar equipos con algoritmo de colas' },
      { codigo: 'TIEMPOREAL_LIBERAR', modulo: 'Ocupación', descrip: 'Liberar puestos y registrar checkout' },
      { codigo: 'TIEMPOREAL_ASISTENCIAS', modulo: 'Ocupación', descrip: 'Consultar histórico de asistencias' },

      // Módulo 5: Reservas Académicas
      { codigo: 'RESERVAS_SOLICITAR', modulo: 'Reservas', descrip: 'Solicitar reserva de salas' },
      { codigo: 'RESERVAS_CONSULTAR', modulo: 'Reservas', descrip: 'Consultar estado y calendario de reservas' },
      { codigo: 'RESERVAS_CANCELAR', modulo: 'Reservas', descrip: 'Cancelar reservas no ejecutadas' },
      { codigo: 'RESERVAS_GESTIONAR', modulo: 'Reservas', descrip: 'Aprobar o rechazar reservas por jefatura' },

      // Módulo 6: Turnos e Incidencias
      { codigo: 'TURNOS_APERTURA_CIERRE', modulo: 'Turnos', descrip: 'Apertura y cierre de guardia con acta relevo' },
      { codigo: 'TURNOS_INCIDENCIAS_REPORTAR', modulo: 'Turnos', descrip: 'Reportar fallas técnicas de estudiantes' },
      { codigo: 'TURNOS_OBJETOS_EXTRAVIADOS', modulo: 'Turnos', descrip: 'Custodia y entrega de objetos extraviados' },

      // Módulo 7: Soporte Técnico
      { codigo: 'SOPORTE_MANTENIMIENTO_REGISTRAR', modulo: 'Soporte', descrip: 'Registrar órdenes de trabajo en taller' },
      { codigo: 'SOPORTE_RETORNO_CONFIRMAR', modulo: 'Soporte', descrip: 'Confirmar retorno y puesta en marcha' },

      // Módulo 8: Analítica Predictiva y Reportes
      { codigo: 'REPORTES_PREDICTIVOS', modulo: 'Analítica', descrip: 'Generar pronósticos con Machine Learning' },
      { codigo: 'REPORTES_DINAMICOS', modulo: 'Analítica', descrip: 'Reportes ejecutivos para acreditación' },
    ];

    for (const p of catalogoPermisos) {
      const existe = await this.permisoRepo.findOne({ where: { codigo: p.codigo } });
      if (!existe) {
        await this.permisoRepo.save(this.permisoRepo.create(p));
      }
    }
  }

  private async seedRoles() {
    const todosLosPermisos = await this.permisoRepo.find();

    const rolesConfig = [
      {
        nombre: 'ADMINISTRADOR',
        descrip: 'Administrador general del sistema con acceso total a todos los módulos y seguridad',
        filtroPermisos: () => true,
      },
      {
        nombre: 'DOCENTE',
        descrip: 'Docente universitario facultativo con facultades para reservar salas y revisar asistencias',
        filtroPermisos: (codigo: string) =>
          codigo.startsWith('RESERVAS_') ||
          codigo === 'TIEMPOREAL_ASISTENCIAS' ||
          codigo === 'REPORTES_DINAMICOS',
      },
      {
        nombre: 'AUXILIAR',
        descrip: 'Auxiliar de sala responsable de asignación de equipos, aperturas de turno e incidencias',
        filtroPermisos: (codigo: string) =>
          codigo.startsWith('TIEMPOREAL_') ||
          codigo.startsWith('TURNOS_') ||
          codigo === 'INFRA_INVENTARIO_GESTIONAR' ||
          codigo === 'RESERVAS_CONSULTAR',
      },
      {
        nombre: 'TECNICO',
        descrip: 'Técnico de soporte especializado en mantenimiento de hardware y red en taller',
        filtroPermisos: (codigo: string) =>
          codigo.startsWith('SOPORTE_') ||
          codigo.startsWith('INFRA_') ||
          codigo === 'REPORTES_DINAMICOS',
      },
    ];

    for (const r of rolesConfig) {
      let rol = await this.rolRepo.findOne({
        where: { nombre: r.nombre },
        relations: { permisos: true },
      });

      const permisosRol = todosLosPermisos.filter((p) => r.filtroPermisos(p.codigo));

      if (!rol) {
        rol = this.rolRepo.create({
          nombre: r.nombre,
          descrip: r.descrip,
          activo: true,
          permisos: permisosRol,
        });
        await this.rolRepo.save(rol);
        this.logger.log(`Rol ${r.nombre} creado.`);
      } else if (!rol.permisos || rol.permisos.length === 0) {
        rol.permisos = permisosRol;
        await this.rolRepo.save(rol);
      }
    }
  }

  private async seedUsuarios() {
    const adminRol = await this.rolRepo.findOne({ where: { nombre: 'ADMINISTRADOR' } });
    const docenteRol = await this.rolRepo.findOne({ where: { nombre: 'DOCENTE' } });
    const auxiliarRol = await this.rolRepo.findOne({ where: { nombre: 'AUXILIAR' } });
    const tecnicoRol = await this.rolRepo.findOne({ where: { nombre: 'TECNICO' } });

    const usuariosBase = [
      {
        correo: 'admin@uagrm.edu.bo',
        password: 'Admin123*',
        nombres: 'Administrador Central',
        apellidos: 'CITEF - FCEE',
        telefono: '3359000',
        rol: adminRol,
      },
      {
        correo: 'nvmartinezm126@ficct.uagrm.edu.bo',
        password: 'Admin123*',
        nombres: 'Nataly Vanessa',
        apellidos: 'Martinez (Resend Admin)',
        telefono: '70012345',
        rol: adminRol,
      },
      {
        correo: 'docente@uagrm.edu.bo',
        password: 'Docente123*',
        nombres: 'Carlos Alberto',
        apellidos: 'Martinez Soliz',
        telefono: '77012345',
        rol: docenteRol,
      },
      {
        correo: 'auxiliar@uagrm.edu.bo',
        password: 'Auxiliar123*',
        nombres: 'Jael Nataly',
        apellidos: 'Auxiliar de Laboratorio',
        telefono: '78098765',
        rol: auxiliarRol,
      },
      {
        correo: 'tecnico@uagrm.edu.bo',
        password: 'Tecnico123*',
        nombres: 'Roberto',
        apellidos: 'Guzman Soporte',
        telefono: '76054321',
        rol: tecnicoRol,
      },
    ];

    for (const u of usuariosBase) {
      const existe = await this.usuarioRepo.findOne({
        where: { correo_institucional: u.correo },
      });

      if (!existe && u.rol) {
        const passwordHash = await bcrypt.hash(u.password, 10);
        const nuevo = this.usuarioRepo.create({
          correo_institucional: u.correo,
          password_hash: passwordHash,
          nombres: u.nombres,
          apellidos: u.apellidos,
          telefono: u.telefono,
          activo: true,
          roles: [u.rol],
        });
        await this.usuarioRepo.save(nuevo);
        this.logger.log(`Usuario inicial creado: ${u.correo} (Contraseña: ${u.password})`);
      }
    }
  }

  private async seedCarreras() {
    const carrerasFCEE = [
      { codigo: '186-5', nombre: 'Ingeniería Comercial' },
      { codigo: '186-1', nombre: 'Comercio Internacional' },
      { codigo: '186-2', nombre: 'Administración de Empresas' },
      { codigo: '186-3', nombre: 'Economía' },
      { codigo: '186-4', nombre: 'Ingeniería Financiera' },
    ];

    for (const c of carrerasFCEE) {
      const existe = await this.carreraRepo.findOne({
        where: { codigo: c.codigo },
      });
      if (!existe) {
        const nueva = this.carreraRepo.create({
          codigo: c.codigo,
          nombre: c.nombre,
          activo: true,
        });
        await this.carreraRepo.save(nueva);
        this.logger.log(`Carrera creada: ${c.codigo} - ${c.nombre}`);
      }
    }
  }

  private async seedMaterias() {
    const materiasPorCarrera: Record<
      string,
      Array<{ sigla: string; nombre: string; semestre_nivel: number }>
    > = {
      '186-5': [
        { sigla: 'ADM100', nombre: 'Introducción a la Administración', semestre_nivel: 1 },
        { sigla: 'MAT101', nombre: 'Cálculo I', semestre_nivel: 1 },
        { sigla: 'COM200', nombre: 'Fundamentos de Marketing', semestre_nivel: 3 },
        { sigla: 'COM300', nombre: 'Comercio Internacional', semestre_nivel: 5 },
        { sigla: 'COM400', nombre: 'Investigación de Mercados', semestre_nivel: 7 },
      ],
      '186-1': [
        { sigla: 'CPA100', nombre: 'Contabilidad Básica I', semestre_nivel: 1 },
        { sigla: 'CPA200', nombre: 'Contabilidad de Costos', semestre_nivel: 3 },
        { sigla: 'CPA300', nombre: 'Auditoría Financiera', semestre_nivel: 5 },
        { sigla: 'CPA400', nombre: 'Gabinete de Auditoría', semestre_nivel: 7 },
      ],
      '186-2': [
        { sigla: 'ADM101', nombre: 'Teoría Administrativa', semestre_nivel: 1 },
        { sigla: 'ADM200', nombre: 'Organización y Métodos', semestre_nivel: 3 },
        { sigla: 'ADM300', nombre: 'Gestión del Talento Humano', semestre_nivel: 5 },
        { sigla: 'ADM400', nombre: 'Estrategia Empresarial', semestre_nivel: 7 },
      ],
      '186-3': [
        { sigla: 'ECO100', nombre: 'Microeconomía I', semestre_nivel: 2 },
        { sigla: 'ECO200', nombre: 'Macroeconomía I', semestre_nivel: 4 },
        { sigla: 'ECO300', nombre: 'Econometría I', semestre_nivel: 6 },
        { sigla: 'ECO400', nombre: 'Política Económica', semestre_nivel: 8 },
      ],
      '186-4': [
        { sigla: 'FIN100', nombre: 'Matemática Financiera', semestre_nivel: 2 },
        { sigla: 'FIN200', nombre: 'Finanzas Corporativas I', semestre_nivel: 4 },
        { sigla: 'FIN300', nombre: 'Mercado de Valores', semestre_nivel: 6 },
        { sigla: 'FIN400', nombre: 'Gestión de Riesgos Financieros', semestre_nivel: 8 },
      ],
    };

    for (const [codCarrera, materias] of Object.entries(materiasPorCarrera)) {
      const carrera = await this.carreraRepo.findOne({
        where: { codigo: codCarrera },
      });
      if (!carrera) continue;

      for (const m of materias) {
        const existe = await this.materiaRepo.findOne({
          where: { sigla: m.sigla, id_carrera: carrera.id_carrera },
        });
        if (!existe) {
          const nueva = this.materiaRepo.create({
            sigla: m.sigla,
            nombre: m.nombre,
            semestre_nivel: m.semestre_nivel,
            id_carrera: carrera.id_carrera,
            activo: true,
          });
          await this.materiaRepo.save(nueva);
        }
      }
    }
    this.logger.log('Materias de muestra sembradas para carreras de la FCEE.');
  }

  private async seedHorarios() {
    const horariosOperativos = [
      { turno: 'MAÑANA', hora_inicio: '07:00:00', hora_fin: '12:00:00' },
      { turno: 'TARDE', hora_inicio: '12:00:00', hora_fin: '18:00:00' },
      { turno: 'NOCHE', hora_inicio: '18:00:00', hora_fin: '22:00:00' },
    ];

    for (const h of horariosOperativos) {
      const existe = await this.horarioRepo.findOne({
        where: { turno: h.turno },
      });
      if (!existe) {
        const nuevo = this.horarioRepo.create({
          turno: h.turno,
          hora_inicio: h.hora_inicio,
          hora_fin: h.hora_fin,
          activo: true,
        });
        await this.horarioRepo.save(nuevo);
        this.logger.log(`Horario operativo creado: ${h.turno} (${h.hora_inicio} - ${h.hora_fin})`);
      }
    }
  }

  private async seedMotivos() {
    const motivosUso = [
      { descrip: 'Clase Práctica', tipo: 'ACADEMICO' },
      { descrip: 'Examen Parcial', tipo: 'ACADEMICO' },
      { descrip: 'Investigación Libre', tipo: 'LIBRE' },
      { descrip: 'Mantenimiento', tipo: 'ADMINISTRATIVO' },
    ];

    for (const m of motivosUso) {
      const existe = await this.motivoRepo.findOne({
        where: { descrip: m.descrip, tipo: m.tipo },
      });
      if (!existe) {
        const nuevo = this.motivoRepo.create({
          descrip: m.descrip,
          tipo: m.tipo,
          activo: true,
        });
        await this.motivoRepo.save(nuevo);
        this.logger.log(`Motivo de uso creado: ${m.descrip} (${m.tipo})`);
      }
    }
  }

  private async seedDocentes() {
    const docentesMuestra = [
      {
        codigo: 'DOC-1001',
        nombres: 'Carlos Alberto',
        apellidos: 'Martinez Soliz',
        correo: 'carlos.martinez@uagrm.edu.bo',
        telefono: '77012345',
      },
      {
        codigo: 'DOC-1002',
        nombres: 'Maria Elena',
        apellidos: 'Suarez Gomez',
        correo: 'elena.suarez@uagrm.edu.bo',
        telefono: '77098765',
      },
    ];

    for (const d of docentesMuestra) {
      const existe = await this.docenteRepo.findOne({
        where: { codigo: d.codigo },
      });
      if (!existe) {
        const nuevo = this.docenteRepo.create({
          codigo: d.codigo,
          nombres: d.nombres,
          apellidos: d.apellidos,
          correo: d.correo,
          telefono: d.telefono,
          activo: true,
        });
        await this.docenteRepo.save(nuevo);
        this.logger.log(`Docente de muestra registrado: ${d.codigo} (${d.nombres} ${d.apellidos})`);
      }
    }
  }
}
