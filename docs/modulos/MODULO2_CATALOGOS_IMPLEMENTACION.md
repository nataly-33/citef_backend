# MÓDULO 2: CATÁLOGOS Y PARÁMETROS OPERATIVOS - CITEF FCEE UAGRM
**Documento Técnico de Implementación y Guía Exhaustiva de Verificación**

---

## 1. Resumen Ejecutivo del Módulo 2

El **Módulo 2 (Catálogos y Parámetros Operativos)** provee la base de datos maestra y los catálogos académicos y operativos requeridos para el funcionamiento del Centro de Información y Tecnología (**CITEF**) de la Facultad de Ciencias Económicas y Empresariales (**FCEE**) de la **UAGRM**.

El módulo cubre los casos de uso **CU5, CU6, CU7 y CU8**, incorporando la normalización relacional de materias multigrupo ($N:M$ entre Carrera y Materia mediante `carrera_materia`), la vinculación integral y atómica de docentes como usuarios del sistema con credencial institucional unificada (Opción 1 de especialización 1:1), la resolución del catálogo de turnos horarios, y el estricto cumplimiento de directrices de UI/UX, RBAC granular, auditoría forense y diagramación en Enterprise Architect (`DiagramasUML.eapx`).

---

## 2. Casos de Uso Implementados y Arquitectura de Datos

| Caso de Uso | Denominación | Detalle de la Solución Técnica |
| :--- | :--- | :--- |
| **CU5** | **Gestionar catálogos académicos** | Mantenimiento de Carreras y Materias curriculares. Soporte para materias compartidas entre carreras mediante la tabla intermedia `carrera_materia` (`id_carrera`, `id_materia`, `semestre_nivel`). Validación de unicidad de sigla a nivel institucional (`sigla` UNIQUE en `materia`), visualización con badges institucionales por carrera, paginación estándar de 15 filas y bitácora de auditoría. |
| **CU6** | **Gestionar catálogos operativos** | Configuración de Franjas Horarias (`MAÑANA`, `TARDE`, `NOCHE`) con validación de horas `hora_inicio < hora_fin`, endpoints específicos desacoplados de colisiones de ruta (`/horarios/todos` y `/franjas-horarias`), y Motivos de Uso clasificados por categoría (`ACADEMICO`, `LIBRE`, `ADMINISTRATIVO`), con paginación estándar de 15 filas y bitácora de auditoría. |
| **CU7** | **Importar padrón docente y gestión unificada** | Carga masiva mediante drag & drop de libros Excel (`.xlsx`, `.xls`) o `.csv`, y CRUD individual. **Especialización 1:1 con `usuario`:** cada docente importado o creado se da de alta automáticamente en `usuario` con rol `DOCENTE` y contraseña genérica inicial `Docente.CITEF2026*`. Transacción atómica con `QueryRunner` en PostgreSQL, descarga de plantilla oficial CSV/Excel, visor de contraseña institucional para el administrador y edición completa desde el Padrón Docente. |
| **CU8** | **Asignar turnos a auxiliares** | Asignación semestral fija por 6 meses a auxiliares becarios (rol `AUXILIAR`), cálculo automático de fecha fin a 6 meses, validación preventiva contra superposición horaria en el mismo semestre, selector reactivo de auxiliares disponibles y franjas horarias operativas, con registro forense en bitácora. |

---

## 3. Decisiones Arquitectónicas Clave

### 3.1. Relación $N:M$ Carrera – Materia (`carrera_materia`)
- **Problema previo:** Existía una relación $1:N$ donde la materia tenía `id_carrera` y `semestre_nivel`. Esto impedía registrar materias compartidas (multigrupos comunes a carreras como Ingeniería Comercial, Contaduría y Administración).
- **Solución implementada:** 
  - Se eliminaron las columnas `id_carrera` y `semestre_nivel` de la tabla `materia`.
  - Se creó la tabla asociativa `carrera_materia` con clave única compuesta `UNIQUE(id_carrera, id_materia)`.
  - En `DiagramasUML.eapx`, se creó la clase asociativa `CarreraMateria` (ObjID 707) vinculada a `Carrera` y `Asignatura` mediante conectores formales de asociación en el diagrama lógico principal (`DiagramaLogico`).

### 3.2. Especialización Docente – Usuario (Opción 1: Identidad Unificada)
- **Problema previo:** La tabla `docente` duplicaba atributos de usuario (`nombres`, `apellidos`, `correo`, `telefono`), y los docentes importados no podían autenticarse en el sistema para realizar reservas de salas (Módulos 3, 5 y 6).
- **Solución implementada:**
  - `docente` posee `codigo` como PK natural de la UAGRM (`DOC-XXXX`) y una clave foránea única `id_usuario BIGINT UNIQUE NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE`.
  - Los datos personales y de acceso residen en `usuario` (con rol `DOCENTE`), mientras que los atributos académicos (`departamento_academico`, `condicion_contrato`) residen en `docente`.
  - **Contraseña Genérica:** Todo docente creado o importado recibe la contraseña inicial `Docente.CITEF2026*` (hasheada con bcrypt 10 rounds).
  - **Banner Informativo:** En la interfaz de Padrón Docente se muestra un callout discreto con la contraseña por defecto para información del administrador.
  - **Edición Atómica:** El modal de edición en Padrón Docente actualiza simultáneamente los datos de identidad en `usuario` y el perfil docente en `docente`, manteniendo consistencia con la tabla global de `/usuarios`.

### 3.3. Resolución de Colisión de Rutas en Turnos Auxiliares
- **Problema previo:** En `OperativosController`, el endpoint `@Get('horarios/:id')` con `ParseIntPipe` interceptaba antes que `@Get('horarios/todos')`, generando error 400. Además, `OperativosController` exigía el permiso `CAT_HORARIOS_GESTIONAR`, bloqueando a usuarios que únicamente poseían `CAT_ASIGNAR_TURNOS`.
- **Solución implementada:**
  - Se ordenó `@Get('horarios/todos')` previo al wildcard con doble permiso `@Permisos('CAT_HORARIOS_GESTIONAR', 'CAT_ASIGNAR_TURNOS')`.
  - Se añadió el endpoint directo `@Get('franjas-horarias')` en `TurnosAuxiliaresController` que responde a `CAT_ASIGNAR_TURNOS`.
  - En el frontend, el componente recarga las franjas horarias y la lista de auxiliares cada vez que se abre el modal.

---

## 4. Cumplimiento de Directrices y Reglas Inviolables

1. **Cero Emojis:** Todos los botones, iconos de estado, cabeceras y tarjetas emplean exclusivamente la librería vectorial **Bootstrap Icons** (`<i class="bi bi-*"></i>`).
2. **Paleta FCEE:** Rojo Carmesí institucional (`#A81124`) y Azul Marino (`#002855`).
3. **Paginación Estándar de 15 Filas:** Todas las tablas (`carreras`, `materias`, `horarios`, `motivos`, `docentes`, `turnos`) implementan paginación interactiva limitada estrictamente a **15 registros por página**, con controles posicionados en la esquina inferior derecha mediante el componente compartido `<app-pagination>`.
4. **Reutilización Obligatoria de Componentes Compartidos:**
   - `<app-table-card>`: Contenedor estandarizado con cabecera y ranuras para acciones.
   - `<app-pagination>`: Barra interactiva con contador descriptivo `X–Y de Z` y controles a la derecha.
   - `<app-modal-alert>`: Banner de error dentro de modales con diseño institucional `.modal-alert-danger` que no cierra el modal ante rechazos del backend.
   - `<app-confirm-modal>`: Diálogo de confirmación para deshabilitación o eliminación de registros para evitar bajas accidentales.
5. **Validación Visual en Letras Rojas:**
   - Mensajes específicos en letras rojas institucionales (`#DC2626`) debajo de cada campo obligatorio o inválido (`.field-error-text`).
   - Borde resaltado en rojo (`.input-error`) en los inputs correspondientes.
6. **Estandarización de Acciones y Botones:**
   - Botón "Limpiar" estilizado con carmesí sutil en Bitácora, Usuarios y Catálogos.
   - Botones "Cancelar" en todos los modales estilizados uniformemente con rojo carmesí.
   - Barra de filtros con "Buscar" y "Limpiar" en una sola fila compacta.
   - Roles de usuario con insignias de colores diferenciados en la tabla de Usuarios (`ADMINISTRADOR` carmesí, `DOCENTE` índigo, `AUXILIAR` verde esmeralda, `ESTUDIANTE` ámbar).
   - Reducción del grosor de filas en la tabla de Bitácora organizando fecha y hora en formato conciso.
7. **Sidebar Reactivo RBAC Dinámico:**
   - Enlaces visibles condicionados dinámicamente por permisos:
     * `CAT_ACADEMICOS_GESTIONAR` $\rightarrow$ Catálogos Académicos (`/admin/catalogos/academicos`).
     * `CAT_HORARIOS_GESTIONAR` $\rightarrow$ Parámetros Operativos (`/admin/catalogos/operativos`).
     * `CAT_IMPORTAR_DOCENTES` $\rightarrow$ Padrón Docente (`/admin/catalogos/docentes`).
     * `CAT_ASIGNAR_TURNOS` $\rightarrow$ Turnos Auxiliares (`/admin/catalogos/turnos`).
8. **Auditoría Forense y Logs de Servidor:**
   - Registro automático en `bitacora_auditoria` con valores anteriores y nuevos en JSONB para cada operación (`INSERT`, `UPDATE`, `CAMBIO_ESTADO`, `DELETE`, `IMPORTACION_DOCENTES`).
   - Logs en tiempo real en consola del servidor emitidos por `HttpLoggerMiddleware` y servicios de negocio.
9. **Compilación Limpia:** Frontend y backend compilan con **0 errores** (`exit code 0`).

---

## 5. Inventario de Archivos Creados y Modificados

### A. Base de Datos y Modelo UML
| Archivo / Tabla | Tipo | Descripción |
| :--- | :--- | :--- |
| `carrera_materia` | Tabla PostgreSQL | Tabla intermedia para relación $N:M$ entre `carrera` y `materia`. |
| `materia` | Tabla PostgreSQL | Modificada: eliminadas `id_carrera` y `semestre_nivel`, agregada restricción UNIQUE en `sigla`. |
| `docente` | Tabla PostgreSQL | Modificada: FK única `id_usuario` a `usuario`, eliminadas columnas redundantes, agregadas `departamento_academico` y `condicion_contrato`. |
| `DiagramasUML.eapx` | Modelo UML (EA) | Clase asociativa `CarreraMateria` (ObjID 707) agregada a Diagrama 1; conectores $N:M$; conectores extend ocultados en diagramas de detalle de casos de uso para evitar redundancia cruzada. |
| `citef_backend/docs/DISENO_LOGICO_BASE_DATOS.md` | Documentación | Actualización de Secciones 2.2, 2.3, 4, 8 y diagrama Mermaid ERD reflejando `carrera_materia` y la relación 1:1 `docente`–`usuario`. |
| `citef_backend/docs/PLAN_DE_IMPLEMENTACION.md` | Documentación | Actualización del inventario de entidades, endpoints y casos de uso del Módulo 2. |

### B. Backend (`citef_backend/`)
| Archivo | Tipo | Descripción |
| :--- | :--- | :--- |
| `src/modules/catalogos/entities/carrera-materia.entity.ts` | Entidad TypeORM | Modelo para la tabla intermedia `carrera_materia`. |
| `src/modules/catalogos/entities/carrera.entity.ts` | Entidad TypeORM | Actualizada con relación OneToMany hacia `CarreraMateria`. |
| `src/modules/catalogos/entities/materia.entity.ts` | Entidad TypeORM | Actualizada con relación OneToMany hacia `CarreraMateria` y unicidad en sigla. |
| `src/modules/catalogos/entities/docente.entity.ts` | Entidad TypeORM | Actualizada con relación OneToOne hacia `Usuario` vía `id_usuario`. |
| `src/modules/usuarios/entities/usuario.entity.ts` | Entidad TypeORM | Nullability limpia en teléfono y relación OneToOne inversa hacia `Docente`. |
| `src/modules/catalogos/catalogos.module.ts` | Módulo NestJS | Registro de `CarreraMateria`, `Docente`, `Usuario`, `Rol` en `forFeature`. |
| `src/modules/seed/seed.module.ts` y `seed.service.ts` | Seeder | Siembra inicial de carreras, materias con `CarreraMateria`, y docentes vinculados a usuarios con contraseña genérica `Docente.CITEF2026*`. |
| `src/modules/catalogos/services/materias.service.ts` | Servicio | Búsqueda, inserción y actualización con soporte de carreras múltiples por materia. |
| `src/modules/catalogos/services/docentes.service.ts` | Servicio | Transacción atómica con `QueryRunner` para crear simultáneamente `Usuario` y `Docente`, asignación de rol `DOCENTE`, contraseña `Docente.CITEF2026*`. |
| `src/modules/catalogos/controllers/operativos.controller.ts` | Controlador REST | Endpoint `/horarios/todos` posicionado antes de `/:id` y con permiso `CAT_ASIGNAR_TURNOS`. |
| `src/modules/catalogos/controllers/turnos-auxiliares.controller.ts` | Controlador REST | Endpoint `/franjas-horarias` para alimentar el selector de turnos en asignaciones. |
| `src/modules/catalogos/services/carreras.service.ts` | Servicio | Corrección del join en `findAll` hacia `carreras_materias` eliminando error 500. |
| `src/modules/catalogos/services/turnos-auxiliares.service.ts` | Servicio | Método `listarHorariosDisponibles()` para consulta directa de franjas activas. |
| `src/modules/catalogos/services/docentes.service.ts` | Servicio | Importación CSV/Excel robusta (autodetección de comas/puntos y coma, validación de correos duplicados y control de conflicto). |
| `src/modules/catalogos/services/docentes.service.spec.ts` | Pruebas Unitarias | Tests adaptados con mocks de `UsuarioRepository`, `RolRepository` y `QueryRunner`. |

### C. Frontend (`citef_frontend/`)
| Archivo | Tipo | Descripción |
| :--- | :--- | :--- |
| `src/app/pages/inicio/inicio.component.ts` | Vista UI (Panel de Inicio) | Panel de bienvenida institucional para cualquier usuario autenticado (Docente, Auxiliar, Técnico, Administrador) con perfil y módulos activos. |
| `src/app/core/guards/permission.guard.ts` | Guardia Angular | Redirección amigable a `/admin/inicio` para usuarios autenticados sin privilegios administrativos en lugar de cerrar sesión. |
| `src/app/pages/login/login.component.ts` | Vista UI | Redirección condicional tras login: administradores a `/admin/usuarios` y otros roles a `/admin/inicio`. |
| `src/app/layout/shell/shell.component.ts` | Layout Shell | Enlace superior "Inicio / Panel" visible para todos los roles en el Sidebar. |
| `src/app/core/services/catalogos.service.ts` | Servicio Angular | Interfaces `CarreraMateriaAsociada` y `MateriaItem` actualizadas con carreras asociadas. |
| `src/app/core/services/docentes.service.ts` | Servicio Angular | Interfaz `DocenteItem` con `departamento_academico`, `condicion_contrato`, `id_usuario` y respuesta con `password_generica`. |
| `src/app/pages/catalogos/academicos/academicos.component.ts` | Vista UI (CU5) | Filtros de búsqueda y limpiar en una fila, insignias por carrera en la tabla de materias, modal de materias con fallback seguro. |
| `src/app/pages/catalogos/operativos/operativos.component.ts` | Vista UI (CU6) | Ajuste del ancho de columna de descripción en motivos de uso, botón limpiar estandarizado. |
| `src/app/pages/catalogos/importar-docentes/importar-docentes.component.ts` | Vista UI (CU7) | Banner con la contraseña genérica `Docente.CITEF2026*`, columnas de departamento y condición, modal de edición integral. |
| `src/app/pages/catalogos/turnos-auxiliares/turnos-auxiliares.component.ts` | Vista UI (CU8) | Carga reactiva de horarios y auxiliares al abrir el modal, resolución del desplegable de franja horaria. |
| `src/app/pages/usuarios/usuarios.component.ts` | Vista UI | Badges con colores diferenciados por rol, botón cancelar en rojo carmesí. |
| `src/app/pages/auditoria/auditoria.component.ts` | Vista UI | Rediseño de la columna fecha/hora para filas más delgadas y botón limpiar carmesí. |

---

## 6. Guía Paso a Paso para la Verificación

### Paso 1: Iniciar Sesión con Administrador
1. Ingrese a `http://localhost:4200/login`.
2. Credenciales:
   - **Correo:** `admin@uagrm.edu.bo`
   - **Contraseña:** `Admin123*`
3. Verifique los 4 accesos de Catálogos en el Sidebar:
   - `<i class="bi bi-journal-bookmark"></i>` **Catálogos Académicos**
   - `<i class="bi bi-sliders"></i>` **Parámetros Operativos**
   - `<i class="bi bi-file-earmark-spreadsheet"></i>` **Padrón Docente**
   - `<i class="bi bi-calendar-week"></i>` **Turnos Auxiliares**

---

### Paso 2: Probar Padrón Docente y Contraseña Genérica (CU7)
1. Ingrese a **Padrón Docente** (`/admin/catalogos/docentes`).
2. **Banner Informativo de Contraseña:**
   - Compruebe el recuadro superior: *"Contraseña inicial predeterminada: `Docente.CITEF2026*`"*.
3. **Listado de Docentes:**
   - Verifique que la tabla muestra las columnas: Código, Nombre Completo, Correo Institucional, Teléfono, Departamento, Condición y Estado.
4. **Crear / Importar un Docente:**
   - Presione **"Nuevo Docente"**:
     * Ingrese Código: `DOC-3001`, Nombres: `Laura`, Apellidos: `Torres Ríos`, Correo: `laura.torres@uagrm.edu.bo`, Departamento: `Contabilidad`, Condición: `TITULAR`.
     * Guarde y verifique el mensaje de éxito.
5. **Verificación en Usuarios:**
   - Vaya al menú **Gestión de Usuarios** (`/admin/usuarios`).
   - Compruebe que `Laura Torres Ríos` (`laura.torres@uagrm.edu.bo`) aparece automáticamente en la lista de usuarios con la insignia morada de rol `DOCENTE`.
6. **Probar Inicio de Sesión del Docente Creado:**
   - Abra una ventana de incógnito o cierre sesión.
   - Ingrese con el correo `laura.torres@uagrm.edu.bo` y contraseña `Docente.CITEF2026*`.
   - Compruebe que inicia sesión exitosamente en el sistema.

---

### Paso 3: Probar Turnos Auxiliares y Franja Horaria (CU8)
1. Inicie sesión nuevamente como Administrador e ingrese a **Turnos Auxiliares** (`/admin/catalogos/turnos`).
2. Haga clic en **"Asignar Turno"**:
3. **Verificar Desplegable de Franja Horaria:**
   - Compruebe que el selector **"Franja Horaria / Turno"** ahora se despliega correctamente mostrando las opciones activas:
     * `MAÑANA (07:00 - 12:00)`
     * `TARDE (12:00 - 18:00)`
     * `NOCHE (18:00 - 22:00)`
4. **Verificar Desplegable de Auxiliares:**
   - Compruebe que aparecen los usuarios con rol `AUXILIAR` (ej: `Jael Nataly Auxiliar de Laboratorio`).
5. **Asignación y Cálculo a 6 Meses:**
   - Seleccione la fecha de inicio: la fecha de fin se autocalcula automáticamente a 6 meses después.
   - Complete la asignación y compruebe que se añade a la tabla paginada.

---

### Paso 4: Probar Catálogos Académicos y Materias Multicarrera (CU5)
1. Ingrese a **Catálogos Académicos** (`/admin/catalogos/academicos`).
2. **Barra de Filtros Compacta:**
   - Verifique que el campo de búsqueda por texto y los botones "Buscar" y "Limpiar" (en carmesí suave) están alineados en la misma fila.
3. **Pestaña Materias:**
   - Cambie a la pestaña **"Materias"**.
   - Observe las etiquetas/chips que identifican las carreras asociadas a cada materia.
   - Pruebe filtrar por carrera o por semestre.
4. **Creación Multicarrera con Semestres Individuales:**
   - Presione el botón **"Nueva Materia"**:
   - Ingrese Sigla: `CAL100`, Nombre: `Cálculo Diferencial e Integral`.
   - En la sección **"Carreras Curriculares y Semestres"**:
     * Fila 1: Seleccione Carrera: `186-5 Ingeniería Comercial` y Semestre: `Semestre 1`.
     * Presione el botón **"+ Agregar Carrera"**.
     * Fila 2: Seleccione Carrera: `186-4 Ingeniería Financiera` y Semestre: `Semestre 2`.
     * Presione de nuevo **"+ Agregar Carrera"**.
     * Fila 3: Seleccione Carrera: `186-2 Administración de Empresas` y Semestre: `Semestre 1`.
   - Intente seleccionar la misma carrera dos veces: verifique que el sistema muestra el error en letras rojas *"Esta carrera ya fue agregada en otra fila"*.
   - Guarde la materia: compruebe el banner verde y que en la tabla de materias `CAL100` aparece con sus 3 insignias de carrera.
5. **Edición Multicarrera:**
   - Haga clic en el botón de edición (lápiz) de `CAL100`:
   - Verifique que el modal abre precargando las 3 carreras y sus semestres correspondientes.
   - Puede eliminar una asociación usando el basurero de fila o agregar una cuarta carrera. Guarde y compruebe la sincronización atómica.

---

### Paso 5: Probar Parámetros Operativos (CU6)
1. Ingrese a **Parámetros Operativos** (`/admin/catalogos/operativos`).
2. **Pestaña Franjas Horarias:**
   - Verifique los turnos operativos precargados y pruebe crear una nueva franja con validación de hora fin posterior a inicio.
3. **Pestaña Motivos de Uso:**
   - Compruebe la columna descripción con tamaño ajustado y los botones de acción por fila.

---

### Paso 6: Verificación de Estilos Globales
1. Ingrese a **Gestión de Usuarios** (`/admin/usuarios`):
   - Compruebe los colores diferenciados de los roles en la tabla.
   - Abra el modal "Nuevo Usuario" y verifique que el botón "Cancelar" tiene el estilo institucional en rojo carmesí.
2. Ingrese a **Bitácora de Auditoría** (`/admin/auditoria`):
   - Compruebe que la columna de Fecha y Hora es más compacta y las filas no están abultadas verticalmente.
   - Verifique el botón "Limpiar" estilizado uniformemente.

---

## 7. Certificación de Calidad y Cumplimiento

- **Compilación Backend (`npm run build` en `citef_backend`):** Código de salida `0`, 0 errores.
- **Compilación Frontend (`npm run build` en `citef_frontend`):** Código de salida `0`, 0 errores.
- **Pruebas Unitarias Backend (`npm test` en `citef_backend`):** **8 suites pasadas, 32 pruebas exitosas (100% PASS)**.
- **Auditoría de Emojis:** 0 emojis detectados en plantillas, componentes o mensajes.
- **Paginación Uniforme:** Estándar institucional de 15 filas por página con `<app-pagination>` posicionado a la derecha.
- **Puertos y Servicios en Ejecución:** Puertos 3000, 4200 y PostgreSQL 5432 activos sin interrupción.
- **Modelo Enterprise Architect:** `DiagramasUML.eapx` sincronizado al 100% con la base de datos y casos de uso.
