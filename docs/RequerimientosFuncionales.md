# Especificación de Requisitos del Sistema (SRS) - CITEF

## Sistema Web de Gestión y Monitoreo Inteligente para Laboratorios de Computación de la FCEE - UAGRM

---

### 1. Introducción y Propósito

El presente documento define la especificación formal de Requisitos del Sistema para la plataforma web de gestión del **Centro de Innovación Tecnológica Facultativa (CITEF)** de la Facultad de Ciencias Económicas y Empresariales (**FCEE**) de la Universidad Autónoma Gabriel René Moreno (**UAGRM**), elaborado bajo los estándares metodológicos de la norma **IEEE 830-1998** y el **Proceso Unificado de Desarrollo de Software (RUP/UML)** para Taller de Grado.

El sistema resuelve la carencia de herramientas automatizadas identificada en las entrevistas con la Jefatura de Laboratorios (Ing. Carmen), digitalizando la operación de las salas mediante:

1. Control de accesos granular por roles con gestión integral de cuentas y restablecimiento institucional de contraseñas.
2. Gestión de infraestructura física (salas, capacidad de máquinas de estudiantes y estación docente) y configuración topológica.
3. Carga masiva de datos académicos e institucionales (más de 300 docentes) mediante archivos CSV/Excel con validación por lotes.
4. Asignación de turnos operativos a auxiliares becarios de laboratorio.
5. Monitoreo síncrono en tiempo real (WebSockets) de asignación y liberación de computadoras/equipos.
6. Gestión y validación algorítmica preventiva de solapamiento de horarios en solicitudes de reservas docentes.
7. Apertura y cierre de turnos con actas estructuradas y reporte de averías técnicas vinculando al último usuario responsable.
8. Soporte técnico integral en taller y confirmación de retorno a sala.
9. Analítica predictiva de saturación y demanda estudiantil mediante el modelo Machine Learning `RandomForestRegressor` de Scikit-learn.
10. Reportes dinámicos multicriterio con filtros parametrizables para Acreditación Académica Facultativa y auditoría institucional.

---

### 2. Caracterización de Actores del Sistema (Actores Humanos Exclusivos)

En cumplimiento estricto con la especificación de **UML 2.5**, el sistema no se modela como actor. Todos los actores corresponden a roles humanos externos al límite del sistema que interactúan con sus interfaces:

| Actor | Perfil y Responsabilidades en el Sistema |
| :--- | :--- |
| **Administrador / Jefatura de Laboratorios (CITEF)** | Personal directivo y administrativo con privilegios totales. Administra cuentas de usuario, roles y políticas de acceso. Configura la infraestructura física de salas, laboratorios y turnos de atención. Asigna turnos semanales a auxiliares becarios. Importa masivamente padrones docentes desde CSV/Excel. Aprueba, rechaza o gestiona solicitudes de reservas docentes. Monitorea dashboards globales en tiempo real. Consulta auditorías, proyecciones de Machine Learning y genera reportes oficiales para Decanatura y Acreditación. |
| **Docente** | Miembro del plantel docente de la FCEE debidamente registrado. Consulta disponibilidad de horarios de salas de cómputo, registra solicitudes formales de reserva para clases prácticas o exámenes y cancela oportunamente sus reservas cuando no hará uso del espacio. |
| **Auxiliar de Laboratorio** | Estudiante universitario becario asignado a la atención por turnos en el CITEF. Asigna y libera equipos en el mapa interactivo en tiempo real asociando estudiante, carrera y motivo. Configura la distribución visual de salas e inventario operativo de periféricos por delegación de jefatura. Registra apertura y cierre de turno. Custodia y devuelve objetos extraviados. Reporta averías técnicas vinculando al último estudiante o la materia responsable. |
| **Técnico de Laboratorio** | Personal técnico especializado encargado del mantenimiento de hardware y software. Visualiza las órdenes de averías pendientes, registra la reparación técnica en taller y confirma la puesta en marcha / disponibilidad en sala una vez reinstalado el equipo. |

---

### 3. Matriz Resumen de Requisitos Funcionales

| ID | Nombre del Requisito Funcional | Paquete / Módulo | Prioridad |
| :--- | :--- | :--- | :--- |
| **RF1** | Gestión Integral de Usuarios | Administración y Seguridad | Esencial |
| **RF2** | Gestión de Roles y Permisos | Administración y Seguridad | Esencial |
| **RF3** | Registro y Consulta de Bitácora de Auditoría | Administración y Seguridad | Esencial |
| **RF4** | Gestión de Catálogos Académicos | Catálogos y Parámetros | Esencial |
| **RF5** | Gestión de Catálogos Operativos | Catálogos y Parámetros | Esencial |
| **RF6** | Importación Masiva del Padrón Docente | Catálogos y Parámetros | Esencial |
| **RF7** | Asignación de Turnos a Auxiliares de Laboratorio | Catálogos y Parámetros | Esencial |
| **RF8** | Gestión de Salas y Capacidad Operativa | Infraestructura y Recursos | Esencial |
| **RF9** | Configuración de Salas de Laboratorios | Infraestructura y Recursos | Esencial |
| **RF10** | Control de Inventario Operativo de Periféricos | Infraestructura y Recursos | Esencial |
| **RF11** | Monitoreo Visual en Tiempo Real del Estado de Salas | Ocupación en Tiempo Real | Esencial |
| **RF12** | Registro de Asignación de Equipos a Estudiantes | Ocupación en Tiempo Real | Esencial |
| **RF13** | Registro de Liberación de Equipos y Cálculo de Permanencia | Ocupación en Tiempo Real | Esencial |
| **RF14** | Consulta Histórica de Asistencias de Estudiantes | Ocupación en Tiempo Real | Esencial |
| **RF15** | Solicitud de Reservas Docentes de Espacios | Reservas Académicas | Esencial |
| **RF16** | Validación Algorítmica de Disponibilidad y Solapamiento | Reservas Académicas | Esencial |
| **RF17** | Gestión de Reservas de Espacios | Reservas Académicas | Esencial |
| **RF18** | Calendario Interactivo y Disponibilidad de Salas | Reservas Académicas | Esencial |
| **RF19** | Registro de Apertura y Cierre de Turno de Laboratorio | Turnos e Incidencias | Esencial |
| **RF20** | Reporte de Averías Técnicas de Equipos | Turnos e Incidencias | Esencial |
| **RF21** | Control y Custodia de Bienes Extraviados | Turnos e Incidencias | Esencial |
| **RF22** | Gestión de Mantenimiento Técnico de Equipos | Soporte y Mantenimiento | Esencial |
| **RF23** | Procesamiento Histórico y Entrenamiento de Modelos (FastAPI) | Analítica Predictiva (ML) | Deseable |
| **RF24** | Generación de Pronósticos de Demanda y Saturación (Random Forest) | Analítica Predictiva (ML) | Deseable |
| **RF25** | Generación de Reportes Dinámicos Parametrizados para Acreditación | Reportes e Indicadores | Esencial |

---

### 4. Especificación Detallada de Requisitos Funcionales (Formato RUP / IEEE 830)

#### Paquete 1: Administración y Seguridad

##### RF1: Gestión Integral de Usuarios

- **Identificador:** RF1
- **Prioridad:** Esencial
- **Nombre:** Gestión Integral de Usuarios
- **Descripción:** El sistema deberá permitir al Administrador registrar, consultar, actualizar y desactivar cuentas de acceso para todos los roles del sistema (Jefatura, Docentes, Auxiliares, Técnicos). La interfaz provee modales interactivos que solicitan información contextual según el rol seleccionado (para docentes: departamento y materias; para auxiliares: matrícula universitaria y semestre). Adicionalmente, el sistema proveerá un mecanismo de autoservicio de recuperación de contraseña para los usuarios mediante correo institucional institucional con enlace seguro y token criptográfico temporal.
- **Usuarios:** Administrador / Jefatura CITEF, Todos los usuarios registrados
- **Usuario Iniciador:** Administrador (para administración de cuentas) / Cualquier usuario registrado (para recuperación de credenciales)
- **Precondición:** Para gestión: Administrador autenticado. Para recuperación: Correo institucional previamente dado de alta y activo.
- **Proceso Principal:**
  1. **Gestión de cuentas:** El Administrador ingresa al módulo de usuarios. Hace clic en "Nuevo Usuario".
  2. Selecciona el rol institucional. El formulario dinámico despliega los campos correspondientes (datos base: nombre, apellido, correo, clave; si es docente: materias y departamento; si es auxiliar: registro y carrera).
  3. El sistema valida unicidad de correo institucional y matrícula. Al confirmar, persiste el usuario y envía credenciales iniciales.
  4. **Recuperación de contraseña:** Un usuario registrado solicita restablecimiento en el login ingresando su correo `@uagrm.edu.bo`. El sistema valida la cuenta, emite un token criptográfico con vigencia de 15 minutos y remite un correo seguro. El usuario define su nueva clave cumpliendo políticas de seguridad.
- **Postcondición:** Cuenta de usuario registrada, modificada o contraseña restablecida.
- **Excepciones:** Correo institucional duplicado o inexistente; token de restablecimiento expirado.

##### RF2: Gestión de Roles y Permisos

- **Identificador:** RF2
- **Prioridad:** Esencial
- **Nombre:** Gestión de Roles y Permisos
- **Descripción:** El sistema deberá proveer un esquema de Control de Acceso Basado en Roles (RBAC), permitiendo al Administrador consultar y parametrizar los privilegios asignados a cada rol institucional (Jefatura, Docente, Auxiliar, Técnico) sobre los diferentes módulos del sistema (lectura, registro, edición, aprobación, reportes).
- **Usuarios:** Administrador / Jefatura CITEF
- **Usuario Iniciador:** Administrador / Jefatura CITEF
- **Precondición:** Administrador autenticado con rol directivo.
- **Proceso Principal:**
  1. El Administrador accede al panel de políticas de seguridad.
  2. Visualiza la matriz de roles y módulos disponibles.
  3. Asigna o revoca permisos específicos a un rol institucional.
  4. El sistema valida que los permisos mínimos del rol Administrador no puedan ser revocados para evitar bloqueos del sistema.
  5. Confirma los cambios y el sistema actualiza las políticas en la base de datos.
- **Postcondición:** Matriz de permisos actualizada y reflejada en las sesiones de usuario.
- **Excepciones:** Intento de deshabilitar permisos administrativos esenciales.

##### RF3: Registro y Consulta de Bitácora de Auditoría

- **Identificador:** RF3
- **Prioridad:** Esencial
- **Nombre:** Registro y Consulta de Bitácora de Auditoría
- **Descripción:** El sistema deberá registrar de manera automática, inalterable y persistente cada acción crítica realizada por los usuarios (creación de cuentas, aprobaciones o rechazos de reservas, asignaciones y liberaciones de equipos, reportes de averías, actas de turno y reparaciones técnicas), almacenando fecha/hora, usuario, rol, IP de origen, entidad afectada y detalle de la operación. La Jefatura dispondrá de una interfaz para consultar y filtrar estos registros cronológicamente.
- **Usuarios:** Administrador / Jefatura CITEF
- **Usuario Iniciador:** Administrador / Jefatura CITEF
- **Precondición:** Operaciones del sistema efectuadas previamente.
- **Proceso Principal:**
  1. Cada endpoint crítico intercepta la petición y persiste la traza de auditoría en la base de datos.
  2. La Jefatura accede al panel de "Auditoría del Sistema".
  3. Aplica filtros por rango de fechas, usuario responsable, módulo o acción efectuada.
  4. El sistema retorna la bitácora ordenada cronológicamente con paginación y exportación tabular.
- **Postcondición:** Trazabilidad institucional consultada para fines de control y auditoría.
- **Excepciones:** Prohibición estricta de borrado o alteración manual de registros de auditoría.

---

#### Paquete 2: Catálogos y Parámetros Académicos

##### RF4: Gestión de Catálogos Académicos

- **Identificador:** RF4
- **Prioridad:** Esencial
- **Nombre:** Gestión de Catálogos Académicos
- **Descripción:** El sistema deberá permitir al Administrador registrar, actualizar y consultar las carreras de la FCEE (Ingeniería Comercial, Administración de Empresas, Contaduría Pública, etc.), sus semestres lectivos y las asignaturas que cursan prácticas en laboratorios.
- **Usuarios:** Administrador / Jefatura CITEF
- **Usuario Iniciador:** Administrador / Jefatura CITEF
- **Precondición:** Administrador autenticado.
- **Proceso Principal:**
  1. El Administrador accede a catálogos académicos.
  2. Da de alta o edita individualmente carreras, materias y semestres asociados.
  3. El sistema valida códigos únicos y nombres de asignaturas.
  4. Guarda las entidades en la base de datos institucional.
- **Postcondición:** Catálogo académico estructurado disponible para reservas y asignaciones.
- **Excepciones:** Código de materia o carrera duplicado.

##### RF5: Gestión de Catálogos Operativos

- **Identificador:** RF5
- **Prioridad:** Esencial
- **Nombre:** Gestión de Catálogos Operativos
- **Descripción:** El sistema permitirá administrar las franjas horarias de los turnos de atención del CITEF (Mañana, Tarde, Noche) con sus horas de inicio y fin, así como los motivos normalizados de ocupación estudiantil (Prácticas curriculares, Trabajos de investigación, Exámenes, Libre navegación académica).
- **Usuarios:** Administrador / Jefatura CITEF
- **Usuario Iniciador:** Administrador / Jefatura CITEF
- **Precondición:** Administrador autenticado.
- **Proceso Principal:**
  1. El Administrador define o actualiza los horarios oficiales de cada turno y la lista de motivos de uso.
  2. El sistema valida que los turnos no presenten inconsistencias horarias.
  3. Se confirman los parámetros operativos para los selectores de atención.
- **Postcondición:** Parámetros operativos actualizados en los formularios de asignación y reportes.
- **Excepciones:** Solapamiento temporal erróneo entre turnos definidos.

##### RF6: Importación Masiva del Padrón Docente

- **Identificador:** RF6
- **Prioridad:** Esencial
- **Nombre:** Importación Masiva del Padrón Docente
- **Descripción:** El sistema deberá proveer una funcionalidad especializada para importar masivamente el padrón oficial de docentes de la FCEE (más de 300 docentes) mediante archivos CSV o Excel estructurados. El módulo valida por lotes el formato de datos, unicidad de registro docente y correo institucional, asociando automáticamente las materias impartidas y creando las cuentas de acceso iniciales con reporte inmediato de filas exitosas e inconsistencias detectadas.
- **Usuarios:** Administrador / Jefatura CITEF
- **Usuario Iniciador:** Administrador / Jefatura CITEF
- **Precondición:** Administrador autenticado y archivo CSV/Excel preparado según la plantilla estándar.
- **Proceso Principal:**
  1. El Administrador descarga la plantilla oficial de carga docente en CSV o Excel.
  2. Selecciona "Cargar Padrón Docente" y sube el archivo a la plataforma.
  3. El sistema procesa el archivo: valida unicidad de registros docentes, formato de correos y existencia de materias.
  4. Muestra un resumen previo indicando cantidad de docentes nuevos, actualizados y errores detectados.
  5. El Administrador confirma la importación; el sistema crea las cuentas de acceso y almacena el padrón docente.
- **Postcondición:** Padrón docente actualizado y habilitado para realizar solicitudes de reserva.
- **Excepciones:** Archivo incompatible o registros con correos institucionales duplicados (se reportan filas omitidas).

##### RF7: Asignación de Turnos a Auxiliares de Laboratorio

- **Identificador:** RF7
- **Prioridad:** Esencial
- **Nombre:** Asignación de Turnos a Auxiliares de Laboratorio
- **Descripción:** El sistema permitirá a la Jefatura registrar y administrar la asignación de turnos operativos semanales para los auxiliares de laboratorio (estudiantes becarios de atención), vinculando su usuario con los días de la semana y turnos específicos (Mañana, Tarde, Noche) en los que deben cumplir su jornada de atención en el CITEF.
- **Usuarios:** Administrador / Jefatura CITEF
- **Usuario Iniciador:** Administrador / Jefatura CITEF
- **Precondición:** Usuario del auxiliar registrado previamente en el sistema.
- **Proceso Principal:**
  1. El Administrador accede a "Turnos de Auxiliares".
  2. Selecciona al auxiliar y asigna los días y franjas de turno correspondientes a su beca de trabajo.
  3. El sistema valida que no existan cruces de horario incoherentes.
  4. Guarda la asignación horaria para el control de apertura y cierre de turno.
- **Postcondición:** Turnos semanales programados y vigentes para el auxiliar.
- **Excepciones:** Auxiliar sin cuenta de usuario activa.

---

#### Paquete 3: Infraestructura y Recursos

##### RF8: Gestión de Salas y Capacidad Operativa

- **Identificador:** RF8
- **Prioridad:** Esencial
- **Nombre:** Gestión de Salas y Capacidad Operativa
- **Descripción:** El sistema deberá permitir al Administrador registrar y configurar los laboratorios de cómputo del CITEF, especificando: código de sala, nombre descriptivo, ubicación física, cantidad de computadoras para estudiantes, existencia de estación docente, proyector multimedia, acondicionador de aire y estado operativo (Operativo, En Mantenimiento, Deshabilitado). La capacidad total se calcula automáticamente sumando las computadoras de estudiantes y el puesto docente.
- **Usuarios:** Administrador / Jefatura CITEF
- **Usuario Iniciador:** Administrador / Jefatura CITEF
- **Precondición:** Acceso autorizado con rol de Jefatura.
- **Proceso Principal:**
  1. El Administrador accede a "Infraestructura de Salas".
  2. Ingresa los datos del laboratorio diferenciando la cantidad de máquinas de estudiantes de la estación docente.
  3. El sistema calcula la capacidad total de equipos de la sala.
  4. Se guarda la información en la base de datos institucional.
- **Postcondición:** Sala registrada con su capacidad operativa claramente diferenciada.
- **Excepciones:** Código de laboratorio duplicado; capacidad total igual a cero.

##### RF9: Configuración de Salas de Laboratorios

- **Identificador:** RF9
- **Prioridad:** Esencial
- **Nombre:** Configuración de Salas de Laboratorios
- **Descripción:** El sistema deberá permitir a la Jefatura y a los Auxiliares de Laboratorio (por delegación operativa) diseñar o actualizar la cuadrícula topológica y distribución visual de cada sala, posicionando cada computadora en filas y columnas, asignando identificador del puesto (ej. PC-01, PC-Docente), tipo de máquina (Estudiante / Docente) y atributos de red referenciales, así como su estado inicial.
- **Usuarios:** Administrador / Jefatura CITEF, Auxiliar de Laboratorio
- **Usuario Iniciador:** Administrador / Auxiliar de Laboratorio
- **Precondición:** Sala registrada previamente.
- **Proceso Principal:**
  1. El usuario accede al diseñador visual de la sala seleccionada.
  2. Ubica los equipos en la cuadrícula indicando el identificador del puesto y marcando si corresponde a puesto de alumno o puesto docente.
  3. Ingresa opcionalmente datos técnicos de red si se dispone de la información autorizada.
  4. Guarda los cambios; el sistema actualiza la topología del mapa interactivo.
- **Postcondición:** Cuadrícula de sala actualizada y disponible para el monitoreo visual.
- **Excepciones:** Superposición de dos máquinas en las mismas coordenadas de fila y columna.

##### RF10: Control de Inventario Operativo de Periféricos

- **Identificador:** RF10
- **Prioridad:** Esencial
- **Nombre:** Control de Inventario Operativo de Periféricos
- **Descripción:** El sistema permitirá a los Auxiliares de Laboratorio y a la Jefatura mantener un inventario de control interno de los componentes y periféricos asignados a cada computadora (modelo y serial de monitor, teclado, mouse, CPU, estabilizador y protectores), actualizando su condición física (Bueno, Regular, Dañado, Faltante). Este inventario es estrictamente operativo del laboratorio y no interfiere con activos fijos universitarios.
- **Usuarios:** Auxiliar de Laboratorio, Administrador / Jefatura CITEF
- **Usuario Iniciador:** Auxiliar de Laboratorio / Administrador
- **Precondición:** Computadora registrada en la sala.
- **Proceso Principal:**
  1. El Auxiliar inspecciona visualmente el laboratorio durante su turno.
  2. Selecciona una máquina y actualiza la lista de periféricos conectados y su estado.
  3. En caso de detectar un periférico dañado, actualiza su estado a Dañado o Faltante para justificar el mantenimiento.
  4. El sistema guarda la composición de la estación.
- **Postcondición:** Inventario interno de componentes de sala actualizado para auditoría.
- **Excepciones:** Componente asignado simultáneamente a dos máquinas distintas sin traslado formal.

---

#### Paquete 4: Ocupación en Tiempo Real

##### RF11: Monitoreo Visual en Tiempo Real del Estado de Salas

- **Identificador:** RF11
- **Prioridad:** Esencial
- **Nombre:** Monitoreo Visual en Tiempo Real del Estado de Salas
- **Descripción:** El sistema proveerá una vista gráfica interactiva tipo mapa de sala donde cada computadora se representa con un color indicativo de su estado vigente: Verde (Disponible), Rojo (Ocupada por estudiante), Amarillo (Reservada por clase académica), Gris (En Mantenimiento) y Azul (Estación docente activa). Toda modificación se sincroniza instantáneamente mediante WebSockets con todas las terminales conectadas sin recargar la página.
- **Usuarios:** Administrador / Jefatura CITEF, Auxiliar de Laboratorio
- **Usuario Iniciador:** Auxiliar de Laboratorio / Administrador
- **Precondición:** Conexión de red establecida y sesión autenticada.
- **Proceso Principal:**
  1. El usuario abre el panel de monitoreo de la sala deseada.
  2. El sistema se suscribe al canal WebSocket de la sala y renderiza el mapa con la ocupación actual.
  3. Al producirse una asignación, liberación o reporte de daño, el servidor emite el evento y la interfaz del usuario actualiza de inmediato el cuadro del equipo en pantalla.
- **Postcondición:** Visualización fidedigna y síncrona de la ocupación física de los laboratorios.
- **Excepciones:** Desconexión de red: la interfaz muestra un indicador de reconexión automática en segundo plano.

##### RF12: Registro y Asignación Inteligente de Equipos a Estudiantes

- **Identificador:** RF12
- **Prioridad:** Esencial
- **Nombre:** Registro y Asignación Inteligente de Equipos a Estudiantes
- **Descripción:** El sistema permitirá al Auxiliar de Laboratorio asignar una computadora libre a un estudiante: seleccionando una máquina disponible (o utilizando la función de **Sugerencia Algorítmica de Asignación**, la cual selecciona automáticamente el equipo óptimo para balancear las horas acumuladas de uso del hardware), digitando el registro universitario (autocompletando datos si ya asistió antes), seleccionando la carrera y el motivo de uso. El sistema valida que el estudiante no tenga otra asignación activa simultánea, cambia la máquina a estado "Ocupada" e inicia el cronómetro de sesión. En escenarios de alta saturación de sala (>90%), el sistema desplegará el **tiempo estimado de espera ($W_q$)** para el siguiente cupo disponible, calculado mediante el modelo estocástico de **Teoría de Colas ($M/M/c$)**.
- **Usuarios:** Auxiliar de Laboratorio
- **Usuario Iniciador:** Auxiliar de Laboratorio
- **Precondición:** Existe al menos una computadora en estado "Disponible" o cola de espera activa.
- **Proceso Principal:**
  1. El Auxiliar activa la asignación haciendo clic en una computadora disponible en el mapa interactivo o pulsando "Asignación Sugerida" (balanceo de horas de funcionamiento).
  2. Ingresa el registro del estudiante; el sistema recupera sus datos institucionales o permite registrarlos si es su primera visita.
  3. Selecciona la carrera y el motivo académico de uso del catálogo.
  4. Confirma la asignación; el sistema inicia la sesión de uso, actualiza el estado de la máquina a "Ocupada" (rojo) y difunde el evento síncronamente vía WebSockets.
  5. Si la sala está colmada, el sistema calcula y muestra al auxiliar el tiempo de espera proyectado ($W_q$) basado en la tasa de servicio ($\mu$) de las sesiones vigentes.
- **Postcondición:** Asignación registrada, cronómetro activo y métricas de colas actualizadas.
- **Excepciones:** El estudiante ya se encuentra ocupando otra máquina en cualquier laboratorio del CITEF (bloqueo por asignación concurrente).

##### RF13: Registro de Liberación de Equipos y Cálculo de Permanencia

- **Identificador:** RF13
- **Prioridad:** Esencial
- **Nombre:** Registro de Liberación de Equipos y Cálculo de Permanencia
- **Descripción:** El sistema permitirá al Auxiliar de Laboratorio marcar la desocupación de un equipo cuando el estudiante finaliza sus actividades. El sistema registrará la hora de culminación, calculará el tiempo efectivo de uso en minutos, restituirá el estado de la máquina a "Disponible" y emitirá el cambio inmediatamente mediante WebSockets.
- **Usuarios:** Auxiliar de Laboratorio
- **Usuario Iniciador:** Auxiliar de Laboratorio
- **Precondición:** La computadora se encuentra en estado "Ocupada".
- **Proceso Principal:**
  1. El Auxiliar hace clic en una computadora ocupada (color rojo) en el mapa.
  2. Verifica los datos de permanencia y selecciona "Liberar Equipo".
  3. El sistema computa los minutos de uso, cierra la asignación en la base de datos histórica y cambia el estado a Disponible.
  4. Se difunde la actualización por WebSockets y la máquina vuelve a mostrarse en verde.
- **Postcondición:** Asignación consolidada en el histórico y máquina libre para nuevos alumnos.
- **Excepciones:** Estación ya liberada por otra terminal concurrente.

##### RF14: Consulta Histórica de Asistencias de Estudiantes

- **Identificador:** RF14
- **Prioridad:** Esencial
- **Nombre:** Consulta Histórica de Asistencias de Estudiantes
- **Descripción:** El sistema permitirá consultar el historial individual de un estudiante mediante su número de registro, mostrando fecha y hora de sus ingresos, laboratorios y computadoras ocupadas, duración de permanencia e historial de incidencias u objetos extraviados vinculados.
- **Usuarios:** Auxiliar de Laboratorio, Administrador / Jefatura CITEF
- **Usuario Iniciador:** Auxiliar de Laboratorio / Administrador
- **Precondición:** Registro universitario consultado.
- **Proceso Principal:**
  1. El usuario introduce el número de registro en el buscador de estudiantes.
  2. El sistema recupera y despliega la línea de tiempo de asistencias e incidencias del estudiante.
- **Postcondición:** Ficha de asistencias visualizada para fines de control y trazabilidad.
- **Excepciones:** Estudiante sin registros previos de asistencia en el CITEF.

---

#### Paquete 5: Reservas Académicas

##### RF15: Solicitud de Reservas Docentes de Espacios

- **Identificador:** RF15
- **Prioridad:** Esencial
- **Nombre:** Solicitud de Reservas Docentes de Espacios
- **Descripción:** El sistema permitirá a los docentes registrados consultar el calendario de ocupación y registrar solicitudes de reserva de laboratorios para clases prácticas, talleres curriculares o exámenes, indicando fecha, franja horaria requerida, sala, materia, grupo y cantidad estimada de alumnos. Asimismo, permite al docente cancelar oportunamente sus solicitudes pendientes o confirmadas si no usará el espacio.
- **Usuarios:** Docente
- **Usuario Iniciador:** Docente
- **Precondición:** Docente activo y autenticado en el sistema.
- **Proceso Principal:**
  1. El Docente accede al módulo de reservas y hace clic en nueva solicitud.
  2. Selecciona la sala, la fecha y el horario deseado.
  3. Completa los datos de la asignatura, grupo y cantidad de alumnos esperados.
  4. Envía la solicitud; el sistema ejecuta la validación algorítmica preventiva y la almacena en estado "Pendiente".
- **Postcondición:** Solicitud de reserva registrada y en cola de evaluación por la Jefatura.
- **Excepciones:** Capacidad de la sala inferior a la cantidad de alumnos solicitados.

##### RF16: Validación Algorítmica de Disponibilidad y Solapamiento

- **Identificador:** RF16
- **Prioridad:** Esencial
- **Nombre:** Validación Algorítmica de Disponibilidad y Solapamiento
- **Descripción:** El sistema deberá verificar mediante un algoritmo de control de intersección temporal que, al registrar una solicitud o aprobar una reserva, no exista solapamiento horario con ninguna otra reserva aprobada en la misma sala para esa fecha, impidiendo estrictamente duplicidades o cruces de horarios.
- **Usuarios:** Administrador / Jefatura CITEF, Docente
- **Usuario Iniciador:** Docente (al solicitar) / Administrador (al aprobar)
- **Precondición:** Horario y sala especificados.
- **Proceso Principal:**
  1. Al enviar o evaluar una reserva, el backend ejecuta una consulta de solapamiento sobre intervalos temporales `[inicio, fin]` para la sala y fecha dadas.
  2. Si existe colisión horaria con otra reserva aprobada, la transacción se interrumpe y se señalan los horarios libres.
  3. Si no existe conflicto, se autoriza la continuidad de la operación.
- **Postcondición:** Validación formal de no colisión garantizada por el backend.
- **Excepciones:** Detección de colisión horaria: el sistema bloquea el registro con un mensaje explicativo.

##### RF17: Gestión de Reservas de Espacios

- **Identificador:** RF17
- **Prioridad:** Esencial
- **Nombre:** Gestión de Reservas de Espacios
- **Descripción:** La Jefatura del CITEF dispondrá de una bandeja para revisar las solicitudes de reserva pendientes, aprobarlas (bloqueando oficialmente el laboratorio en el calendario), rechazarlas (ingresando un motivo obligatorio) o reprogramarlas en común acuerdo con el docente solicitante.
- **Usuarios:** Administrador / Jefatura CITEF
- **Usuario Iniciador:** Administrador / Jefatura CITEF
- **Precondición:** Existencia de solicitudes pendientes o reservas programadas.
- **Proceso Principal:**
  1. La Jefatura selecciona la reserva pendiente en la bandeja de gestión.
  2. Revisa la validación de disponibilidad y capacidad.
  3. Si aprueba, el estado pasa a "Aprobada" y se refleja en el calendario interactivo.
  4. Si rechaza, registra la justificación y el estado pasa a "Rechazada".
- **Postcondición:** Reserva gestionada y estado actualizado en el calendario oficial de laboratorios.
- **Excepciones:** Intento de aprobar una reserva con solapamiento temporal no resuelto.

##### RF18: Calendario Interactivo y Disponibilidad de Salas

- **Identificador:** RF18
- **Prioridad:** Esencial
- **Nombre:** Calendario Interactivo y Disponibilidad de Salas
- **Descripción:** El sistema proveerá una vista gráfica interactiva (mensual y semanal) donde docentes, auxiliares y la administración podrán visualizar las franjas horarias ocupadas por reservas aprobadas y los bloques de tiempo libres en cada uno de los laboratorios del CITEF.
- **Usuarios:** Docente, Auxiliar de Laboratorio, Administrador / Jefatura CITEF
- **Usuario Iniciador:** Docente / Auxiliar / Administrador
- **Precondición:** Horarios y reservas registradas.
- **Proceso Principal:**
  1. El usuario accede al calendario y selecciona la sala y la semana a consultar.
  2. El sistema despliega visualmente los bloques ocupados indicando materia, docente y horario.
- **Postcondición:** Disponibilidad de espacios visualizada en pantalla de forma clara.
- **Excepciones:** Sin excepciones.

---

#### Paquete 6: Turnos e Incidencias

##### RF19: Registro de Apertura, Cierre y Relevo de Turno (Handover)

- **Identificador:** RF19
- **Prioridad:** Esencial
- **Nombre:** Registro de Apertura, Cierre y Relevo de Turno (Handover)
- **Descripción:** El sistema proveerá al Auxiliar de Laboratorio un flujo estructurado para registrar la apertura de turno mediante un **checklist digital rápido** (estado general de orden, encendido y conexión de sala), el cómputo automático de atenciones durante la jornada, y un **protocolo formal de relevo (Handover)** al cierre de turno. Si existen incidencias pendientes (averías técnicas activas o bienes extraviados no reclamados), el sistema generará un acta de traspaso que el auxiliar del turno entrante deberá revisar y aceptar digitalmente al iniciar su jornada, garantizando la trazabilidad estricta y evitando la evasión de responsabilidades operativas entre auxiliares.
- **Usuarios:** Auxiliar de Laboratorio, Administrador / Jefatura CITEF
- **Usuario Iniciador:** Auxiliar de Laboratorio
- **Precondición:** Auxiliar autenticado con turno asignado en el cronograma semanal.
- **Proceso Principal:**
  1. **Apertura de turno:** El Auxiliar entrante accede al sistema, completa el checklist inicial de verificación de sala y visualiza si el turno saliente dejó novedades pendientes.
  2. Al confirmar el relevo (Handover), asume la responsabilidad operativa del turno.
  3. **Cierre de turno:** Al culminar su horario, abre el formulario de cierre; el sistema consolida automáticamente el total de alumnos atendidos, horas de uso y novedades registradas.
  4. El Auxiliar ingresa observaciones finales y confirma el cierre del turno.
  5. El sistema emite el acta estructurada de turno y la archiva con sello de tiempo para auditoría de Jefatura.
- **Postcondición:** Turno cerrado con acta de relevo auditada y responsabilidades delimitadas.
- **Excepciones:** Estaciones de trabajo aún marcadas como "Ocupadas" al momento de intentar el cierre (el sistema exige liberar o justificar los puestos activos).

##### RF20: Reporte de Averías Técnicas de Equipos

- **Identificador:** RF20
- **Prioridad:** Esencial
- **Nombre:** Reporte de Averías Técnicas de Equipos
- **Descripción:** El sistema permitirá al Auxiliar reportar cualquier desperfecto en una computadora o periférico (pantalla sin señal, periférico roto, fallo de red). El sistema vinculará contextualmente el reporte: si la falla ocurrió tras uso libre, asociará al **último estudiante asignado**; si ocurrió tras una clase curricular o práctica docente, asociará la **materia, docente y reserva responsable del aula**. La máquina cambiará automáticamente su estado a "En Mantenimiento" y se generará una orden técnica en la cola del taller.
- **Usuarios:** Auxiliar de Laboratorio, Administrador / Jefatura CITEF
- **Usuario Iniciador:** Auxiliar de Laboratorio
- **Precondición:** Computadora existente en el CITEF.
- **Proceso Principal:**
  1. El Auxiliar selecciona la máquina averiada en el mapa interactivo.
  2. Especifica el tipo de falla y redacta la descripción del desperfecto.
  3. El sistema analiza el historial reciente del puesto: asocia contextualmente al último estudiante libre o a la materia y docente de la clase reciente.
  4. Cambia el estado de la máquina a "En Mantenimiento" y genera la orden para el técnico.
  5. Se emite el cambio por WebSockets para inhabilitar la máquina en pantalla.
- **Postcondición:** Máquina bloqueada con orden técnica y responsable contextual documentado.
- **Excepciones:** Máquina ya registrada con una orden técnica pendiente.

##### RF21: Control y Custodia de Bienes Extraviados

- **Identificador:** RF21
- **Prioridad:** Esencial
- **Nombre:** Control y Custodia de Bienes Extraviados
- **Descripción:** El sistema proveerá un módulo para registrar bienes u objetos olvidados en las salas (descripción, categoría, sala, fecha, turno y auxiliar que lo encontró), manteniéndolos en estado "Bajo Custodia". Cuando el estudiante reclame la pertenencia, el auxiliar comprobará su registro universitario o cédula de identidad, registrará la entrega y cambiará el estado a "Devuelto", manteniendo la trazabilidad sin requerir firmas digitales.
- **Usuarios:** Auxiliar de Laboratorio, Administrador / Jefatura CITEF
- **Usuario Iniciador:** Auxiliar de Laboratorio
- **Precondición:** Objeto hallado dentro de las instalaciones del CITEF.
- **Proceso Principal:**
  1. El Auxiliar registra la ficha del objeto olvidado en el sistema (estado "Bajo Custodia").
  2. Al presentarse el estudiante a reclamarlo, el Auxiliar busca el registro del objeto.
  3. Solicita identificación del alumno (RU o CI), ingresa su nombre y registro en el formulario de entrega.
  4. El sistema actualiza el estado a "Devuelto" registrando fecha, hora y auxiliar responsable de la entrega.
- **Postcondición:** Trazabilidad formal del bien extraviado registrada y archivada.
- **Excepciones:** Entrega intentada sin completar el registro o identificación del estudiante solicitante.

---

#### Paquete 7: Soporte y Mantenimiento Técnico

##### RF22: Gestión de Mantenimiento Técnico de Equipos

##### RF22: Gestión de Mantenimiento Técnico de Equipos y Métricas de Confiabilidad

- **Identificador:** RF22
- **Prioridad:** Esencial
- **Nombre:** Gestión de Mantenimiento Técnico de Equipos y Métricas de Confiabilidad
- **Descripción:** El sistema proveerá al Técnico de Laboratorio un módulo integral para consultar la cola de órdenes de avería pendientes y gestionar el ciclo de reparación en dos fases operativas:
  1. **Reparación en Taller:** Diagnóstico y trabajo técnico en taller con registro de repuestos, formateo y notas técnicas (estado "En Reparación" -> "Reparado en Taller").
  2. **Puesta en Marcha / Retorno a Sala:** Confirmación de reinstalación física y reconexión en el laboratorio, restituyendo automáticamente el estado a "Disponible" y sincronizándolo en tiempo real vía WebSockets.
  Adicionalmente, el sistema calculará de forma automática las métricas estándar de confiabilidad y mantenimiento para cada máquina y sala: **MTBF** (*Mean Time Between Failures* - tiempo promedio entre fallas consecutivas), **MTTR** (*Mean Time To Repair* - tiempo promedio de reparación en taller) y el factor de **Disponibilidad Operativa ($A = \frac{MTBF}{MTBF + MTTR}$)**.
- **Usuarios:** Técnico de Laboratorio, Administrador / Jefatura CITEF
- **Usuario Iniciador:** Técnico de Laboratorio
- **Precondición:** Existencia de órdenes técnicas en estado pendiente o en taller.
- **Proceso Principal:**
  1. El Técnico accede a su bandeja de soporte técnico y selecciona la orden pendiente.
  2. Registra el inicio de trabajos y diagnóstico en taller (estado: "En Reparación").
  3. Al solucionar el problema físico/lógico, marca el equipo como "Reparado en Taller" registrando componentes sustituidos y tiempo de intervención.
  4. Una vez devuelto el equipo a la sala, confirma "Puesto en Marcha"; el sistema cierra la orden técnica, devuelve la máquina a estado "Disponible", difunde el cambio por WebSockets y recalcula el MTTR del equipo y la disponibilidad global de la sala.
- **Postcondición:** Ciclo técnico completado, equipo operativo en sala y métricas de confiabilidad actualizadas.
- **Excepciones:** Declaración de equipo irrecuperable (se da de baja técnica del inventario de sala).

---

#### Paquete 8: Analítica Predictiva con Machine Learning y Teoría de Colas

##### RF23: Procesamiento Histórico y Entrenamiento de Modelos (FastAPI)

- **Identificador:** RF23
- **Prioridad:** Deseable
- **Nombre:** Procesamiento Histórico y Entrenamiento de Modelos (FastAPI)
- **Descripción:** El microservicio analítico desarrollado en Python y FastAPI se conectará a la base de datos PostgreSQL para extraer, procesar y entrenar periódicamente los modelos predictivos sobre el histórico de asistencias y ocupación de salas (analizando variables temporales: día de la semana, turno, semana del semestre académico, carrera solicitante y tasa de ocupación).
- **Usuarios:** Administrador / Jefatura CITEF
- **Usuario Iniciador:** Administrador / Jefatura CITEF
- **Precondición:** Registros históricos de ocupación acumulados en la base de datos.
- **Proceso Principal:**
  1. La Jefatura solicita o programa el reentrenamiento del modelo predictivo desde el panel de analítica.
  2. El microservicio FastAPI extrae los registros de la base de datos, normaliza los datos con Pandas y entrena el modelo de regresión con Scikit-learn.
  3. Serializa y almacena las métricas de precisión y el modelo binario actualizado.
- **Postcondición:** Modelo analítico reentrenado y preparado para responder a consultas de inferencia.
- **Excepciones:** Volumen de datos históricos inferior al umbral mínimo estadístico (se genera aviso de registros insuficientes).

##### RF24: Generación de Pronósticos de Demanda, Saturación y Modelado de Colas

- **Identificador:** RF24
- **Prioridad:** Deseable
- **Nombre:** Generación de Pronósticos de Demanda, Saturación y Modelado de Colas
- **Descripción:** El sistema ejecutará el modelo `RandomForestRegressor` de Scikit-learn en conjunto con el modelo de **Teoría de Colas ($M/M/c$)** a través de la API de FastAPI para estimar la demanda proyectada de computadoras, estimar la tasa media de arribos ($\lambda$), tasa de permanencia ($\mu$) y calcular el factor de utilización ($\rho = \frac{\lambda}{c \cdot \mu}$). El sistema anticipará qué salas, turnos y periodos (ej. semanas de exámenes) presentan riesgo de saturación crítica ($\rho > 0.85$), sugiriendo a la Jefatura la cantidad óptima de servidores/puestos ($c$) para mantener los tiempos de espera bajo umbrales tolerables.
- **Usuarios:** Administrador / Jefatura CITEF
- **Usuario Iniciador:** Administrador / Jefatura CITEF
- **Precondición:** Modelo predictivo entrenado disponible en el microservicio.
- **Proceso Principal:**
  1. La Jefatura selecciona el laboratorio y el periodo futuro a evaluar (ej. semana de exámenes parciales).
  2. El backend invoca al microservicio FastAPI enviando las variables de consulta.
  3. El microservicio computa las estimaciones de afluencia, calcula los parámetros de colas ($W_q, \rho$) y clasifica los niveles de saturación.
  4. La interfaz de Angular despliega las curvas proyectadas de concurrencia, tiempo medio de espera previsto y alertas de saturación.
- **Postcondición:** Pronóstico analítico y modelado de colas visualizado en el tablero de gestión estratégica.
- **Excepciones:** Microservicio FastAPI inaccesible temporalmente (se proyecta con promedio ponderado histórico reciente como contingencia).

---

#### Paquete 9: Reportes e Indicadores para Acreditación Académica y Asistente Analítico

##### RF25: Generación de Reportes Dinámicos y Asistente Analítico para Acreditación

- **Identificador:** RF25
- **Prioridad:** Esencial
- **Nombre:** Generación de Reportes Dinámicos y Asistente Analítico para Acreditación
- **Descripción:** El sistema deberá permitir a la Jefatura generar reportes estadísticos consolidados y dinámicos sobre el uso de los laboratorios, permitiendo seleccionar parámetros y filtros personalizados (rango exacto de fechas, salas específicas, carreras de la FCEE, turnos, docentes, materias y tipos de uso), exportando los documentos en PDF y Excel para respaldar la acreditación académica y auditorías de Decanatura. Adicionalmente, el sistema incorporará un **Asistente Analítico de Consultas en Lenguaje Natural** (Text-to-SQL seguro), permitiendo a la Jefatura realizar preguntas en lenguaje cotidiano (ej. *"¿Cuál fue la sala con mayor saturación en septiembre?"*) que el sistema procesa mediante llamadas a herramientas estructuradas (Tool Calling) sobre réplicas de lectura de la base de datos.
- **Usuarios:** Administrador / Jefatura CITEF
- **Usuario Iniciador:** Administrador / Jefatura CITEF
- **Precondición:** Registros operativos existentes en el sistema para los parámetros seleccionados.
- **Proceso Principal:**
  1. La Jefatura accede a "Reportes Institucionales y Acreditación".
  2. Puede optar por filtros tradicionales (carreras, fechas, salas y turnos) o ingresar una consulta directa en el Asistente Analítico.
  3. El sistema procesa la consulta y presenta el cuadro estadístico consolidado con gráficos asociados e indicadores clave.
  4. La Jefatura selecciona exportar a PDF o Excel; el sistema compila y entrega el documento oficial estructurado.
- **Postcondición:** Documento de reporte oficial generado y archivado.
- **Excepciones:** No existen registros coincidentes con la combinación de filtros seleccionada.
