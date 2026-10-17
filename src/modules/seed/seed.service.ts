import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Rol } from '../usuarios/entities/rol.entity';
import { Permiso } from '../usuarios/entities/permiso.entity';

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
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Verificando inicialización de datos base (Seeder)...');
    await this.seedPermisos();
    await this.seedRoles();
    await this.seedUsuarios();
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
}
