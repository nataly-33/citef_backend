import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Rol } from '../usuarios/entities/rol.entity';
import { Permiso } from '../usuarios/entities/permiso.entity';
import { Carrera } from '../catalogos/entities/carrera.entity';
import { Materia } from '../catalogos/entities/materia.entity';
import { CarreraMateria } from '../catalogos/entities/carrera-materia.entity';
import { HorarioOperativo } from '../catalogos/entities/horario-operativo.entity';
import { MotivoUso } from '../catalogos/entities/motivo-uso.entity';
import { Docente } from '../catalogos/entities/docente.entity';
import { LaboratorioSala } from '../infraestructura/entities/laboratorio-sala.entity';
import { Computadora } from '../infraestructura/entities/computadora.entity';
import { TipoPeriferico } from '../infraestructura/entities/tipo-periferico.entity';
import { PerifericoInventario } from '../infraestructura/entities/periferico-inventario.entity';
import { Estudiante } from '../ocupacion/entities/estudiante.entity';
import { AsignacionSesion } from '../ocupacion/entities/asignacion-sesion.entity';
import { ColaEsperaSala } from '../ocupacion/entities/cola-espera-sala.entity';

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
    @InjectRepository(CarreraMateria)
    private readonly carreraMateriaRepo: Repository<CarreraMateria>,
    @InjectRepository(HorarioOperativo)
    private readonly horarioRepo: Repository<HorarioOperativo>,
    @InjectRepository(MotivoUso)
    private readonly motivoRepo: Repository<MotivoUso>,
    @InjectRepository(Docente)
    private readonly docenteRepo: Repository<Docente>,
    @InjectRepository(LaboratorioSala)
    private readonly salaRepo: Repository<LaboratorioSala>,
    @InjectRepository(Computadora)
    private readonly computadoraRepo: Repository<Computadora>,
    @InjectRepository(TipoPeriferico)
    private readonly tipoPerifericoRepo: Repository<TipoPeriferico>,
    @InjectRepository(PerifericoInventario)
    private readonly perifericoInventarioRepo: Repository<PerifericoInventario>,
    @InjectRepository(Estudiante)
    private readonly estudianteRepo: Repository<Estudiante>,
    @InjectRepository(AsignacionSesion)
    private readonly sesionRepo: Repository<AsignacionSesion>,
    @InjectRepository(ColaEsperaSala)
    private readonly colaRepo: Repository<ColaEsperaSala>,
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
    await this.seedInfraestructura();
    await this.seedEstudiantes();
    await this.seedSesionesIniciales();
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
        let materia = await this.materiaRepo.findOne({
          where: { sigla: m.sigla },
        });
        if (!materia) {
          materia = await this.materiaRepo.save(
            this.materiaRepo.create({
              sigla: m.sigla,
              nombre: m.nombre,
              activo: true,
            }),
          );
        }

        const existeCM = await this.carreraMateriaRepo.findOne({
          where: { id_carrera: carrera.id_carrera, id_materia: materia.id_materia },
        });
        if (!existeCM) {
          await this.carreraMateriaRepo.save(
            this.carreraMateriaRepo.create({
              id_carrera: carrera.id_carrera,
              id_materia: materia.id_materia,
              semestre_nivel: m.semestre_nivel,
              activo: true,
            }),
          );
        }
      }
    }
    this.logger.log('Materias y mallas curriculares de muestra sembradas para la FCEE.');
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
    const PASSWORD_GENERICA_DOCENTES = 'Docente.CITEF2026*';
    const passwordHashDocente = await bcrypt.hash(PASSWORD_GENERICA_DOCENTES, 10);
    const rolDocente = await this.rolRepo.findOne({ where: { nombre: 'DOCENTE' } });

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
      const existeDocente = await this.docenteRepo.findOne({
        where: { codigo: d.codigo },
      });
      if (!existeDocente) {
        let usuario = await this.usuarioRepo.findOne({
          where: { correo_institucional: d.correo },
        });
        if (!usuario) {
          usuario = await this.usuarioRepo.save(
            this.usuarioRepo.create({
              correo_institucional: d.correo,
              password_hash: passwordHashDocente,
              nombres: d.nombres,
              apellidos: d.apellidos,
              telefono: d.telefono,
              activo: true,
              roles: rolDocente ? [rolDocente] : [],
            }),
          );
        }

        const nuevoDocente = this.docenteRepo.create({
          codigo: d.codigo,
          id_usuario: usuario.id_usuario,
          departamento_academico: 'General',
          condicion_contrato: 'TITULAR',
          activo: true,
        });
        await this.docenteRepo.save(nuevoDocente);
        this.logger.log(`Docente de muestra registrado: ${d.codigo} (${d.nombres} ${d.apellidos})`);
      }
    }
  }

  private async seedInfraestructura() {
    // 1. Tipos de periféricos
    const tipos = ['TECLADO', 'MOUSE', 'MONITOR', 'ESTABILIZADOR', 'HEADSET'];
    const tiposMap = new Map<string, TipoPeriferico>();

    for (const t of tipos) {
      let tipo = await this.tipoPerifericoRepo.findOne({ where: { nombre: t } });
      if (!tipo) {
        tipo = await this.tipoPerifericoRepo.save(
          this.tipoPerifericoRepo.create({ nombre: t, activo: true }),
        );
        this.logger.log(`Tipo de periférico creado: ${t}`);
      }
      tiposMap.set(t, tipo);
    }

    // 2. Salas de Cómputo
    const salasData = [
      {
        codigo_sala: 'LAB-01',
        nombre: 'Laboratorio de Informática 1',
        piso: 1,
        cant_estudiantes: 24,
        maquina_docente: true,
        proyector: true,
        aire_acondicionado: true,
        filas_cuadricula: 6,
        columnas_cuadricula: 8,
        estado_operativo: 'OPERATIVA',
      },
      {
        codigo_sala: 'LAB-02',
        nombre: 'Laboratorio de Finanzas y Modelado 2',
        piso: 2,
        cant_estudiantes: 20,
        maquina_docente: true,
        proyector: true,
        aire_acondicionado: true,
        filas_cuadricula: 6,
        columnas_cuadricula: 8,
        estado_operativo: 'OPERATIVA',
      },
    ];

    for (const s of salasData) {
      let sala = await this.salaRepo.findOne({ where: { codigo_sala: s.codigo_sala } });
      if (!sala) {
        sala = await this.salaRepo.save(this.salaRepo.create({ ...s, activo: true }));
        this.logger.log(`Sala creada: ${s.codigo_sala} - ${s.nombre}`);

        // Si es LAB-01, generar estaciones de trabajo iniciales
        if (s.codigo_sala === 'LAB-01') {
          // PC Docente en fila 1, columna 4
          const pcDocente = await this.computadoraRepo.save(
            this.computadoraRepo.create({
              id_sala: sala.id_sala,
              codigo_equipo: 'L1-DOCENTE',
              maquina_docente: true,
              posicion_fila: 1,
              posicion_columna: 4,
              estado_actual: 'DISPONIBLE',
              ip_red: '192.168.10.10',
              mac_address: '00:1A:2B:3C:4D:00',
              horas_uso_acumuladas: 15.5,
              activo: true,
            }),
          );

          // Equipos para alumnos (12 estaciones distribuidas en filas 2 a 4)
          const pcsAlumnos: Computadora[] = [];
          let pcIndex = 1;
          for (let f = 2; f <= 4; f++) {
            for (const c of [2, 3, 6, 7]) {
              const numStr = pcIndex < 10 ? `0${pcIndex}` : `${pcIndex}`;
              const pc = await this.computadoraRepo.save(
                this.computadoraRepo.create({
                  id_sala: sala.id_sala,
                  codigo_equipo: `L1-PC${numStr}`,
                  maquina_docente: false,
                  posicion_fila: f,
                  posicion_columna: c,
                  estado_actual: 'DISPONIBLE',
                  ip_red: `192.168.10.${10 + pcIndex}`,
                  mac_address: `00:1A:2B:3C:4D:${numStr}`,
                  horas_uso_acumuladas: Number((Math.random() * 20).toFixed(2)),
                  activo: true,
                }),
              );
              pcsAlumnos.push(pc);
              pcIndex++;
            }
          }

          // Equipar la PC docente con periféricos
          if (tiposMap.get('MONITOR')) {
            await this.perifericoInventarioRepo.save(
              this.perifericoInventarioRepo.create({
                id_computadora: pcDocente.id_computadora,
                id_tipo_periferico: tiposMap.get('MONITOR')!.id_tipo_periferico,
                marca_modelo: 'Dell Professional P2419H 24"',
                numero_activo: 'CN-0K752D-74261-987-DOC',
                condicion_fisica: 'BUENO',
                activo: true,
              }),
            );
          }
          if (tiposMap.get('TECLADO')) {
            await this.perifericoInventarioRepo.save(
              this.perifericoInventarioRepo.create({
                id_computadora: pcDocente.id_computadora,
                id_tipo_periferico: tiposMap.get('TECLADO')!.id_tipo_periferico,
                marca_modelo: 'Logitech K120 USB',
                numero_activo: 'SN-LOGI-K120-DOC',
                condicion_fisica: 'BUENO',
                activo: true,
              }),
            );
          }
          if (tiposMap.get('MOUSE')) {
            await this.perifericoInventarioRepo.save(
              this.perifericoInventarioRepo.create({
                id_computadora: pcDocente.id_computadora,
                id_tipo_periferico: tiposMap.get('MOUSE')!.id_tipo_periferico,
                marca_modelo: 'Logitech M100 Óptico',
                numero_activo: 'SN-LOGI-M100-DOC',
                condicion_fisica: 'BUENO',
                activo: true,
              }),
            );
          }

          // Equipar las primeras 4 PCs de alumnos
          for (let i = 0; i < Math.min(4, pcsAlumnos.length); i++) {
            const pc = pcsAlumnos[i];
            const num = i + 1;
            if (tiposMap.get('MONITOR')) {
              await this.perifericoInventarioRepo.save(
                this.perifericoInventarioRepo.create({
                  id_computadora: pc.id_computadora,
                  id_tipo_periferico: tiposMap.get('MONITOR')!.id_tipo_periferico,
                  marca_modelo: 'Samsung LED 22" Full HD',
                  numero_activo: `SAM-LED22-PC0${num}`,
                  condicion_fisica: 'BUENO',
                  activo: true,
                }),
              );
            }
            if (tiposMap.get('TECLADO')) {
              await this.perifericoInventarioRepo.save(
                this.perifericoInventarioRepo.create({
                  id_computadora: pc.id_computadora,
                  id_tipo_periferico: tiposMap.get('TECLADO')!.id_tipo_periferico,
                  marca_modelo: 'Genius Smart KB-100',
                  numero_activo: `GEN-KB-PC0${num}`,
                  condicion_fisica: 'BUENO',
                  activo: true,
                }),
              );
            }
            if (tiposMap.get('MOUSE')) {
              await this.perifericoInventarioRepo.save(
                this.perifericoInventarioRepo.create({
                  id_computadora: pc.id_computadora,
                  id_tipo_periferico: tiposMap.get('MOUSE')!.id_tipo_periferico,
                  marca_modelo: 'Genius DX-120 USB',
                  numero_activo: `GEN-MS-PC0${num}`,
                  condicion_fisica: 'BUENO',
                  activo: true,
                }),
              );
            }
          }

          // Periféricos en bodega de reserva
          if (tiposMap.get('TECLADO')) {
            await this.perifericoInventarioRepo.save(
              this.perifericoInventarioRepo.create({
                id_computadora: null,
                id_tipo_periferico: tiposMap.get('TECLADO')!.id_tipo_periferico,
                marca_modelo: 'Logitech K120 USB (Reserva)',
                numero_activo: 'BOD-KB-001',
                condicion_fisica: 'BUENO',
                activo: true,
              }),
            );
          }
          if (tiposMap.get('MOUSE')) {
            await this.perifericoInventarioRepo.save(
              this.perifericoInventarioRepo.create({
                id_computadora: null,
                id_tipo_periferico: tiposMap.get('MOUSE')!.id_tipo_periferico,
                marca_modelo: 'Logitech M90 USB (Reserva)',
                numero_activo: 'BOD-MS-001',
                condicion_fisica: 'BUENO',
                activo: true,
              }),
            );
          }
          if (tiposMap.get('ESTABILIZADOR')) {
            await this.perifericoInventarioRepo.save(
              this.perifericoInventarioRepo.create({
                id_computadora: null,
                id_tipo_periferico: tiposMap.get('ESTABILIZADOR')!.id_tipo_periferico,
                marca_modelo: 'Forza FVR-1001 1000VA',
                numero_activo: 'BOD-EST-001',
                condicion_fisica: 'BUENO',
                activo: true,
              }),
            );
          }

          this.logger.log(`Equipos y periféricos iniciales cargados para ${sala.codigo_sala}`);
        }
      }
    }
  }

  private async seedEstudiantes() {
    const total = await this.estudianteRepo.count();
    if (total > 0) return;

    const carreras = await this.carreraRepo.find();
    if (!carreras.length) return;

    const c1 = carreras[0]?.id_carrera || 1;
    const c2 = carreras[1]?.id_carrera || c1;
    const c3 = carreras[2]?.id_carrera || c1;
    const c4 = carreras[3]?.id_carrera || c1;
    const c5 = carreras[4]?.id_carrera || c1;

    const estudiantes = [
      {
        registro: '220011501',
        ci: '8492019',
        nombres: 'CARLOS ANDRÉS',
        apellidos: 'VARGAS PINTO',
        correo: 'carlos.vargas@uagrm.edu.bo',
        id_carrera: c1,
        sancionado: false,
        motivo_sancion: null,
      },
      {
        registro: '220011502',
        ci: '7381920',
        nombres: 'MARIANA SILVANA',
        apellidos: 'CLAURE ROJAS',
        correo: 'mariana.claure@uagrm.edu.bo',
        id_carrera: c2,
        sancionado: false,
        motivo_sancion: null,
      },
      {
        registro: '220011503',
        ci: '6372819',
        nombres: 'JORGE LUIS',
        apellidos: 'MENDOZA CÉSPEDES',
        correo: 'jorge.mendoza@uagrm.edu.bo',
        id_carrera: c3,
        sancionado: false,
        motivo_sancion: null,
      },
      {
        registro: '220011504',
        ci: '9283710',
        nombres: 'VALERIA ANDREA',
        apellidos: 'SUAREZ ANTELO',
        correo: 'valeria.suarez@uagrm.edu.bo',
        id_carrera: c4,
        sancionado: false,
        motivo_sancion: null,
      },
      {
        registro: '220011505',
        ci: '8472910',
        nombres: 'MAURICIO ESTEBAN',
        apellidos: 'ROCA JUSTINIANO',
        correo: 'mauricio.roca@uagrm.edu.bo',
        id_carrera: c5,
        sancionado: false,
        motivo_sancion: null,
      },
      {
        registro: '220011506',
        ci: '7364810',
        nombres: 'CAMILA NICOLE',
        apellidos: 'HURTADO AGUILERA',
        correo: 'camila.hurtado@uagrm.edu.bo',
        id_carrera: c1,
        sancionado: false,
        motivo_sancion: null,
      },
      {
        registro: '220011507',
        ci: '6251829',
        nombres: 'DIEGO ALEJANDRO',
        apellidos: 'BARBA VACA',
        correo: 'diego.barba@uagrm.edu.bo',
        id_carrera: c2,
        sancionado: false,
        motivo_sancion: null,
      },
      {
        registro: '220011508',
        ci: '5463728',
        nombres: 'PAOLA STEPHANIE',
        apellidos: 'MORENO CUELLAR',
        correo: 'paola.moreno@uagrm.edu.bo',
        id_carrera: c3,
        sancionado: false,
        motivo_sancion: null,
      },
      {
        registro: '220011509',
        ci: '7362514',
        nombres: 'RODRIGO SEBASTIAN',
        apellidos: 'ORTIZ PARADA',
        correo: 'rodrigo.ortiz@uagrm.edu.bo',
        id_carrera: c4,
        sancionado: true,
        motivo_sancion: 'Investigación técnica pendiente por avería reportada en teclado de sala',
      },
      {
        registro: '220011510',
        ci: '8473625',
        nombres: 'FERNANDA LUCIANA',
        apellidos: 'SALVATIERRA RIOS',
        correo: 'fernanda.salvatierra@uagrm.edu.bo',
        id_carrera: c5,
        sancionado: false,
        motivo_sancion: null,
      },
    ];

    for (const est of estudiantes) {
      await this.estudianteRepo.save(this.estudianteRepo.create(est));
    }
    this.logger.log('Padrón inicial de 10 estudiantes de prueba cargado.');
  }

  private async seedSesionesIniciales() {
    const total = await this.sesionRepo.count();
    if (total > 0) return;

    const pcs = await this.computadoraRepo.find({
      where: { activo: true, maquina_docente: false },
      take: 5,
    });
    if (!pcs.length) return;

    const motivos = await this.motivoRepo.find();
    const motivoId = motivos[0]?.id_motivo || 1;

    const aux = await this.usuarioRepo.findOne({
      where: { correo_institucional: 'auxiliar@uagrm.edu.bo' },
    });
    const idAux = aux?.id_usuario || 1;

    const ahora = new Date();

    // 1. Sesión activa para PC 0
    if (pcs[0]) {
      pcs[0].estado_actual = 'OCUPADA';
      await this.computadoraRepo.save(pcs[0]);

      const inicioActiva1 = new Date(ahora.getTime() - 35 * 60000); // Hace 35 min
      await this.sesionRepo.save(
        this.sesionRepo.create({
          id_computadora: pcs[0].id_computadora,
          registro_estudiante: '220011501',
          id_motivo: motivoId,
          id_usuario_auxiliar: idAux,
          fecha_hora_inicio: inicioActiva1,
          estado: 'EN_CURSO',
          asignacion_automatica: false,
        }),
      );
    }

    // 2. Sesión activa para PC 1
    if (pcs[1]) {
      pcs[1].estado_actual = 'OCUPADA';
      await this.computadoraRepo.save(pcs[1]);

      const inicioActiva2 = new Date(ahora.getTime() - 15 * 60000); // Hace 15 min
      await this.sesionRepo.save(
        this.sesionRepo.create({
          id_computadora: pcs[1].id_computadora,
          registro_estudiante: '220011502',
          id_motivo: motivoId,
          id_usuario_auxiliar: idAux,
          fecha_hora_inicio: inicioActiva2,
          estado: 'EN_CURSO',
          asignacion_automatica: true,
        }),
      );
    }

    // 3. Sesiones concluidas históricas
    if (pcs[2]) {
      const inicioH1 = new Date(ahora.getTime() - 180 * 60000);
      const finH1 = new Date(ahora.getTime() - 120 * 60000);
      await this.sesionRepo.save(
        this.sesionRepo.create({
          id_computadora: pcs[2].id_computadora,
          registro_estudiante: '220011503',
          id_motivo: motivoId,
          id_usuario_auxiliar: idAux,
          fecha_hora_inicio: inicioH1,
          fecha_hora_fin: finH1,
          minutos_permanencia: 60,
          estado: 'CONCLUIDA',
          asignacion_automatica: false,
        }),
      );
    }

    if (pcs[3]) {
      const inicioH2 = new Date(ahora.getTime() - 240 * 60000);
      const finH2 = new Date(ahora.getTime() - 150 * 60000);
      await this.sesionRepo.save(
        this.sesionRepo.create({
          id_computadora: pcs[3].id_computadora,
          registro_estudiante: '220011504',
          id_motivo: motivoId,
          id_usuario_auxiliar: idAux,
          fecha_hora_inicio: inicioH2,
          fecha_hora_fin: finH2,
          minutos_permanencia: 90,
          estado: 'CONCLUIDA',
          asignacion_automatica: true,
        }),
      );
    }

    this.logger.log('Sesiones de prueba iniciales (activas e históricas) sembradas.');
  }
}

