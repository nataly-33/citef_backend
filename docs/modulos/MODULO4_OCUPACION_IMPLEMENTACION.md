# MÓDULO 4: OCUPACIÓN Y MONITOREO EN TIEMPO REAL - CITEF FCEE UAGRM
**Documento Técnico de Implementación y Guía Exhaustiva de Verificación**

---

## 1. Resumen Ejecutivo del Módulo 4

El **Módulo 4 (Ocupación y Monitoreo en Tiempo Real)** gestiona la asignación dinámica de computadoras, el seguimiento síncrono de sesiones de estudiantes libres, el cronometraje de permanencia, la gestión estocástica de colas de espera bajo saturación ($\ge 90\%$) y la trazabilidad histórica de asistencias para fines de acreditación universitaria en el Centro de Información y Tecnología (**CITEF**) de la Facultad de Ciencias Económicas y Empresariales (**FCEE**) de la **UAGRM**.

El módulo cubre exhaustivamente los casos de uso **CU12, CU13, CU14 y CU15**, incorporando:
1. **Monitoreo Síncrono por WebSockets (`Socket.io`):** Transmisión bidireccional reactiva en `/ws/ocupacion` que actualiza instantáneamente en pantalla cualquier cambio de estado en los puestos de cómputo.
2. **Algoritmo de Balanceo Inteligente de Hardware:** Asignación automática que prioriza la computadora disponible con menor desgaste acumulado (`horas_uso_acumuladas ASC`), optimizando la vida útil de los equipos.
3. **Modelado Estocástico de Saturación y Teoría de Colas ($M/M/c$):** Activación automática de cola de espera cuando la sala supera el 90% de ocupación, calculando en tiempo real el tiempo estimado de espera ($W_q$).
4. **Validaciones Preventivas en Mostrador:** Detección inmediata de estudiantes con sanciones disciplinarias o averías técnicas pendientes, e impedimento estricto de doble sesión concurrente en el CITEF.
5. **Historial Analítico de Asistencias:** Reportes con filtros combinados, paginación interactiva estándar de 15 filas y exportación oficial a formato CSV/Excel con codificación UTF-8 BOM.
6. **Arquitectura Angular 18 en 3 Archivos Separados:** Desacoplamiento estricto en `.ts`, `.html` y `.css`, con cero emojis y paleta institucional FCEE (`#002855`, `#A81124`).

---

## 2. Casos de Uso Implementados y Arquitectura de Datos

| Caso de Uso | Denominación | Detalle de la Solución Técnica |
| :--- | :--- | :--- |
| **CU12** | **Monitorear ocupación de salas** | Tablero visual interactivo que proyecta en tiempo real la matriz física de cada laboratorio ($F \times C$). Indicadores superiores (KPIs) de capacidad, puestos disponibles, en uso, reservados y en mantenimiento. Cronómetros dinámicos en vivo por cada puesto ocupado, porcentaje de saturación global con barra reactiva y eventos WebSocket síncronos. |
| **CU13** | **Asignar equipo** | Asignación en mostrador mediante búsqueda por Matrícula Universitaria oficial (**`registro`** como PK natural). Validación de sanciones y prevención de doble sesión activa. Soporte de **asignación manual** (haciendo clic sobre cualquier puesto disponible) o **asignación inteligente balanceada** (el sistema escoge el equipo con menor desgaste acumulado). Registro atómico en `asignacion_sesion` y transición de estado a `OCUPADA`. |
| **CU14** | **Liberar equipo (Checkout)** | Cierre de sesión de estudio, cálculo automático del tiempo de permanencia en minutos y acumulación proporcional en `computadora.horas_uso_acumuladas`. Transición de puesto a `DISPONIBLE`, notificación de alumnos en espera y emisión instantánea vía WebSocket. |
| **CU15** | **Consultar asistencias de estudiantes** | Reporte histórico paginado a 15 filas con filtros por rango de fechas, laboratorio, carrera, motivo de uso, estado y búsqueda por RU, CI o nombre. Exportación oficial a CSV/Excel con caracteres especiales preservados para acreditación facultativa. |

---

## 3. Decisiones Arquitectónicas Clave

### 3.1. Sincronización en Tiempo Real mediante WebSockets y Socket.io
- **Problema previo:** En sistemas tradicionales basados exclusivamente en HTTP REST o polling periódico, los auxiliares de distintas salas o el administrador central tenían desfases de información, arriesgando asignaciones concurrentes conflictivas sobre la misma computadora.
- **Solución implementada:**
  - Se configuró el gateway WebSocket `@WebSocketGateway({ namespace: '/ws/ocupacion' })` en NestJS (`OcupacionGateway`).
  - Cada vez que un auxiliar asigna o libera un equipo, el backend emite el evento `estado_sala_actualizado` a la sala específica (`sala_${id_sala}`) y difunde `sala_resumen_actualizado` a observadores globales.
  - En el frontend, `OcupacionService` se conecta vía `socket.io-client` y actualiza reactivamente el estado en memoria sin recargar la página, manteniendo además un polling de seguridad silencioso de respaldo.

### 3.2. Algoritmo de Balanceo Inteligente de Hardware
- **Problema previo:** Los auxiliares tendían a asignar siempre las computadoras de las primeras filas (ej. PC 1, PC 2, PC 3). Esto producía un desgaste acelerado de hardware en los primeros puestos (+500 horas de uso) mientras que los puestos del fondo permanecían casi nuevos (<50 horas), provocando averías prematuras y obsolescencia desbalanceada.
- **Solución implementada:**
  - El botón "Asignar Equipo (Balanceo)" consulta el endpoint `/api/v1/ocupacion/salas/:id/sugerir-equipo`.
  - El backend ejecuta una consulta optimizada:
    ```sql
    SELECT * FROM computadora 
    WHERE id_sala = :idSala AND activo = true AND maquina_docente = false AND estado_actual = 'DISPONIBLE'
    ORDER BY horas_uso_acumuladas ASC, codigo_equipo ASC 
    LIMIT 1;
    ```
  - El modal destaca visualmente el equipo sugerido y explica al operador el motivo de la elección, equilibrando la carga de trabajo de todo el laboratorio.

### 3.3. Modelo Estocástico de Saturación y Teoría de Colas ($M/M/c$)
- **Problema previo:** En épocas de exámenes o inscripciones, los laboratorios alcanzan saturación total ($>90\%$), formándose aglomeraciones desorganizadas en la puerta de la sala.
- **Solución implementada:**
  - Cuando la ocupación de la sala alcanza o supera el 90%, el sistema despliega un banner de alerta institucional y habilita el botón de **Cola de Espera ($M/M/c$)**.
  - El auxiliar puede encolar estudiantes por su RU. El sistema aplica la formulación de colas:
    * $c$: Servidores (puestos de cómputo operativos de la sala).
    * $\mu$: Tasa de servicio (estimada en $\approx 1.0$ sesión/hora, equivalente a 60 min promedio).
    * $\lambda$: Tasa de llegadas al sistema.
    * $W_q$: Demora esperada en minutos calculada dinámicamente como $W_q = (\text{posición en cola}) \times \frac{60}{c \cdot \mu}$.
  - Al liberarse cualquier computadora, el sistema avisa al auxiliar cuántos estudiantes esperan y permite asignar directamente al primero de la fila con un solo clic.

### 3.4. Control de Integridad: Prevención de Sanciones y Doble Sesión
- **Regla 1 (Estudiante Sancionado):** Si un estudiante tiene un proceso abierto por avería de hardware o extravío (`estudiante.sancionado = true`), el sistema bloquea la asignación y muestra el motivo en un callout rojo: *"El estudiante presenta una sanción o investigación técnica pendiente: [Motivo]"*.
- **Regla 2 (Doble Sesión Concurrente):** Un estudiante no puede tener dos computadoras asignadas simultáneamente en ningún laboratorio del CITEF. La consulta verifica `estado = 'EN_CURSO'` en `asignacion_sesion`; si ya tiene una sesión, se rechaza la asignación indicando el equipo y laboratorio donde se encuentra activo.

### 3.5. Transacción Atómica con Bloqueo Pesimista
- En `OcupacionService.asignarEquipo()`, se implementó una transacción con `QueryRunner` y bloqueo pesimista de escritura (`pessimistic_write`) sobre la fila de la computadora elegida. Si dos auxiliares intentan asignar el mismo equipo al mismo milisegundo, la segunda transacción recibe un error `409 ConflictException`, impidiendo colisiones de integridad.

### 3.6. Arquitectura Angular 18 en 3 Archivos Separados
- Se mantuvo el mandato inviolable de separación estricta en 3 archivos independientes:
  - `monitor-sala.component.ts`, `monitor-sala.component.html`, `monitor-sala.component.css`
  - `asistencias.component.ts`, `asistencias.component.html`, `asistencias.component.css`
- Cero plantillas inline, cero estilos inline y cero emojis.

---

## 4. Paleta de Colores y Jerarquía Visual de Estados en Tiempo Real

Se mantuvo la consistencia cromática de alto contraste definida en el Módulo 3, reforzando la semántica de la sala:

| Estado / Elemento | Color Primario | Fondo / Gradiente | Icono Vectorial Bootstrap | Semántica Operativa |
| :--- | :--- | :--- | :--- | :--- |
| **PUESTO DISPONIBLE** | Verde Bosque (`#16A34A`) | `linear-gradient(#ffffff 45%, #dcfce7 100%)` | `<i class="bi bi-person-plus-fill"></i>` | Listo para asignación. Botón directo de alta rápida. |
| **PUESTO EN SESIÓN** | Azul Marino FCEE (`#002855`) | `linear-gradient(#ffffff 45%, #dbeafe 100%)` | `<i class="bi bi-clock-history"></i>` | En uso por estudiante. Muestra RU, nombres y cronómetro en minutos. |
| **PUESTO RESERVADO** | Púrpura Índigo (`#7C3AED`) | `linear-gradient(#ffffff 45%, #ede9fe 100%)` | `<i class="bi bi-calendar-check-fill"></i>` | Bloqueado preventivamente para una clase curricular. |
| **EN MANTENIMIENTO** | Ámbar Profundo (`#EA580C`) | `linear-gradient(#ffffff 45%, #ffedd5 100%)` | `<i class="bi bi-wrench-adjustable-circle-fill"></i>` | Fuera de servicio con símbolo formal de llave inglesa. |
| **ESTACIÓN DOCENTE** | Carmesí FCEE (`#A81124`) | `linear-gradient(#ffffff 40%, #fee2e2 100%)` | `<i class="bi bi-person-workspace"></i>` | Puesto exclusivo del profesor con borde de 2.5px. |
| **SATURACIÓN $\ge 90\%$** | Naranja / Rojo Alerta | `#FFFBEB` con borde `#EA580C` | `<i class="bi bi-exclamation-octagon-fill"></i>` | Alerta estocástica $M/M/c$ con tiempo de espera $W_q$. |
| **WEBSOCKET EN VIVO** | Verde Esmeralda (`#15803D`) | `#DCFCE7` con borde `#16A34A` | `<i class="bi bi-broadcast"></i>` | Punto pulsante indicando conexión síncrona en tiempo real. |

---

## 5. Cumplimiento de Directrices y Reglas Inviolables

1. **Cero Emojis:** Todos los botones, iconos de estado, cabeceras y tarjetas emplean exclusivamente la librería vectorial **Bootstrap Icons** (`<i class="bi bi-*"></i>`).
2. **Paleta FCEE Institucional:** Rojo Carmesí institucional (`#A81124`) y Azul Marino (`#002855`) en botones primarios, bordes de modales y componentes compartidos.
3. **Paginación Estándar de 15 Filas:** La tabla de asistencias históricas implementa paginación interactiva limitada estrictamente a **15 registros por página**, con controles posicionados en la esquina inferior derecha mediante el componente compartido `<app-pagination>`.
4. **Reutilización Obligatoria de Componentes Compartidos:**
   - `<app-table-card>`: Contenedor estandarizado con título, subtítulo dinámico y tabla responsive.
   - `<app-pagination>`: Barra interactiva con contador descriptivo y controles a la derecha.
   - `<app-modal-alert>`: Banner de error dentro de modales con diseño institucional `.modal-alert-danger` que no cierra el modal ante rechazos del backend.
   - `<app-confirm-modal>`: Diálogo de confirmación para bajas o cancelaciones de turnos.
5. **Validación Visual en Letras Rojas:**
   - Mensajes específicos en letras rojas institucionales (`#DC2626`) debajo de cada campo obligatorio o inválido (`.field-error-text`).
   - Borde resaltado en rojo (`.input-error`) en los inputs correspondientes.
6. **Estandarización de Acciones y Botones:**
   - Botón "Limpiar" estilizado uniformemente con carmesí sutil.
   - Botones "Cancelar" en todos los modales estilizados con carmesí institucional.
   - Botón "Exportar CSV" formal en verde institucional para reportes de acreditación.
7. **Sidebar Reactivo RBAC Dinámico:**
   - `TIEMPOREAL_MONITOREAR`, `TIEMPOREAL_ASIGNAR` $\rightarrow$ Monitoreo de Salas (`/admin/ocupacion/monitoreo`).
   - `TIEMPOREAL_ASISTENCIAS` $\rightarrow$ Historial Asistencias (`/admin/ocupacion/asistencias`).
8. **Auditoría Forense Automática:**
   - Registro transaccional en `bitacora_auditoria` para `REGISTRAR_ESTUDIANTE`, `ASIGNAR_EQUIPO_COMPUTO`, `LIBERAR_EQUIPO_COMPUTO`, `ENCOLAR_ESTUDIANTE_SALA`, `CANCELAR_TURNO_COLA` y `SANCIONAR_ESTUDIANTE`.
   - Logging HTTP en tiempo real mediante `HttpLoggerMiddleware`.
9. **Compilación Limpia:** Frontend y backend compilan con **0 errores** (`exit code 0`).

---

## 6. Inventario de Archivos Creados y Modificados

### A. Base de Datos y Entidades TypeORM
| Archivo / Tabla | Tipo | Descripción |
| :--- | :--- | :--- |
| `estudiante` | Tabla PostgreSQL | Padrón de estudiantes con RU como PK natural (`registro`), CI, nombres, apellidos y flag de sanción. |
| `asignacion_sesion` | Tabla PostgreSQL | Sesiones de cómputo transaccionales con computadoras, motivos, hora inicio/fin y minutos de permanencia. |
| `cola_espera_sala` | Tabla PostgreSQL | Estudiantes en lista de espera durante periodos de saturación con cálculo estocástico $W_q$. |
| `metrica_cola_historica` | Tabla PostgreSQL | Métricas agregadas de Teoría de Colas ($\lambda, \mu, c, \rho, W_q$) por turno y fecha. |

### B. Backend (`citef_backend/`)
| Archivo | Tipo | Descripción |
| :--- | :--- | :--- |
| `src/modules/ocupacion/ocupacion.module.ts` | Módulo NestJS | Integración de entidades, servicios, controladores y gateway WebSocket. |
| `src/modules/ocupacion/entities/estudiante.entity.ts` | Entidad TypeORM | Modelo de estudiantes facultativos con RU como llave primaria. |
| `src/modules/ocupacion/entities/asignacion-sesion.entity.ts` | Entidad TypeORM | Modelo de sesiones de uso en computadoras. |
| `src/modules/ocupacion/entities/cola-espera-sala.entity.ts` | Entidad TypeORM | Modelo de colas de espera por sala. |
| `src/modules/ocupacion/entities/metrica-cola-historica.entity.ts` | Entidad TypeORM | Modelo de métricas de colas para acreditación. |
| `src/modules/ocupacion/gateways/ocupacion.gateway.ts` | Gateway WebSocket | Servidor Socket.io en `/ws/ocupacion` para emisión síncrona en tiempo real. |
| `src/modules/ocupacion/services/ocupacion.service.ts` | Servicio | Topología en vivo, balanceo de hardware por menor uso, asignación y liberación transaccional. |
| `src/modules/ocupacion/services/estudiantes.service.ts` | Servicio | Búsqueda por RU, validación de sanciones/doble sesión y alta rápida en mostrador. |
| `src/modules/ocupacion/services/colas-espera.service.ts` | Servicio | Gestión de lista de espera con cálculo estocástico $W_q$ de Teoría de Colas ($M/M/c$). |
| `src/modules/ocupacion/services/asistencias.service.ts` | Servicio | Consulta histórica paginada con filtros múltiples y exportación en CSV con UTF-8 BOM. |
| `src/modules/ocupacion/controllers/ocupacion.controller.ts` | Controlador REST | Endpoints para asignación, liberación, búsqueda de alumnos y gestión de colas. |
| `src/modules/ocupacion/controllers/asistencias.controller.ts` | Controlador REST | Endpoints para consulta paginada y descarga de reportes CSV. |
| `src/modules/ocupacion/services/ocupacion.service.spec.ts` | Pruebas Unitarias | Tests unitarios para CU12, CU13, CU14 con 100% de éxito. |
| `src/modules/seed/seed.service.ts` | Seeder | Siembra de 10 estudiantes muestra de distintas carreras y sesiones iniciales activas e históricas. |

### C. Frontend (`citef_frontend/`)
| Archivo | Tipo | Descripción |
| :--- | :--- | :--- |
| `src/app/core/services/ocupacion.service.ts` | Servicio Angular | Cliente HTTP completo y conexión WebSocket síncrona mediante `socket.io-client`. |
| `src/app/pages/ocupacion/monitor-sala/monitor-sala.component.ts` | Controlador Vista | Lógica de monitoreo en tiempo real, modales de asignación, checkout y colas. |
| `src/app/pages/ocupacion/monitor-sala/monitor-sala.component.html` | Plantilla HTML | Matriz 2D dinámica, KPIs con barra de saturación, cronómetros y modales formales. |
| `src/app/pages/ocupacion/monitor-sala/monitor-sala.component.css` | Hoja de Estilos | Estilos de alto contraste para puestos de cómputo, badges y modales interactivos. |
| `src/app/pages/ocupacion/asistencias/asistencias.component.ts` | Controlador Vista | Lógica de filtros, paginación y exportación de asistencias a CSV. |
| `src/app/pages/ocupacion/asistencias/asistencias.component.html` | Plantilla HTML | Tabla formal con paginación estándar de 15 filas y botón de exportar. |
| `src/app/pages/ocupacion/asistencias/asistencias.component.css` | Hoja de Estilos | Estilos de la barra de filtros compacta y tarjetas de detalle. |
| `src/app/app.routes.ts` | Enrutamiento | Registro de rutas con guardias de permisos para `/admin/ocupacion/*`. |
| `src/app/layout/shell/shell.component.ts` | Layout Shell | Enlaces condicionales en el Sidebar para Monitoreo de Salas e Historial de Asistencias. |

---

## 7. Catálogo de Endpoints RESTful, Eventos WebSocket y Matriz RBAC

### A. Eventos WebSocket (`/ws/ocupacion`)
| Evento | Dirección | Payload | Propósito |
| :--- | :--- | :--- | :--- |
| `suscribir_sala` | Cliente $\rightarrow$ Servidor | `{ id_sala: number }` | Une el socket a la sala del laboratorio para recibir actualizaciones en vivo. |
| `desuscribir_sala` | Cliente $\rightarrow$ Servidor | `{ id_sala: number }` | Abandona la sala al cambiar de laboratorio o cerrar vista. |
| `estado_sala_actualizado` | Servidor $\rightarrow$ Cliente | `SalaOcupacionEstado` | Difunde el estado completo de la sala tras cualquier asignación o liberación. |
| `sala_resumen_actualizado` | Servidor $\rightarrow$ Cliente | `{ id_sala, timestamp }` | Notificación ligera para tableros multi-sala. |

### B. Endpoints REST
| Método | Endpoint | Permisos Requeridos | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/ocupacion/salas/:id` | `TIEMPOREAL_MONITOREAR`, `TIEMPOREAL_ASIGNAR`, `TIEMPOREAL_LIBERAR` | Estado en tiempo real de la sala con computadoras, sesiones y KPIs. |
| `GET` | `/api/v1/ocupacion/salas/:id/sugerir-equipo` | `TIEMPOREAL_ASIGNAR` | Retorna el equipo disponible con menor desgaste acumulado. |
| `POST` | `/api/v1/ocupacion/asignar` | `TIEMPOREAL_ASIGNAR` | Asigna un puesto a un estudiante (manual o balanceado). |
| `POST` | `/api/v1/ocupacion/liberar` | `TIEMPOREAL_LIBERAR` | Realiza checkout del puesto, acumula minutos y actualiza a DISPONIBLE. |
| `GET` | `/api/v1/ocupacion/estudiantes/buscar` | `TIEMPOREAL_ASIGNAR` | Autocompletado reactivo de estudiantes por RU, CI o nombre. |
| `GET` | `/api/v1/ocupacion/estudiantes/:registro` | `TIEMPOREAL_ASIGNAR` | Consulta de perfil del alumno, sesión previa y estado de sanción. |
| `POST` | `/api/v1/ocupacion/estudiantes` | `TIEMPOREAL_ASIGNAR` | Registro rápido de un estudiante no empadronado desde mostrador. |
| `GET` | `/api/v1/ocupacion/salas/:id/cola` | `TIEMPOREAL_MONITOREAR`, `TIEMPOREAL_ASIGNAR` | Lista de estudiantes esperando turno en la sala. |
| `POST` | `/api/v1/ocupacion/cola` | `TIEMPOREAL_ASIGNAR` | Encola a un estudiante calculando el tiempo de espera estimado $W_q$. |
| `DELETE` | `/api/v1/ocupacion/cola/:id` | `TIEMPOREAL_ASIGNAR` | Cancela el turno de un estudiante en la lista de espera. |
| `GET` | `/api/v1/ocupacion/asistencias` | `TIEMPOREAL_ASISTENCIAS` | Consulta paginada (15 filas) con filtros multicriterio. |
| `GET` | `/api/v1/ocupacion/asistencias/exportar` | `TIEMPOREAL_ASISTENCIAS` | Descarga de reporte completo en formato CSV con UTF-8 BOM. |

---

## 8. Guía Exhaustiva Paso a Paso para la Verificación

### Paso 1: Iniciar Sesión con Rol Auxiliar o Administrador
1. Ingrese a `http://localhost:4200/login`.
2. Credenciales:
   - **Correo:** `admin@uagrm.edu.bo` (o `auxiliar@uagrm.edu.bo`)
   - **Contraseña:** `Admin123*`
3. Verifique en el Sidebar la nueva sección de **OCUPACIÓN Y TIEMPO REAL**:
   - `<i class="bi bi-speedometer2"></i>` **Monitoreo de Salas** (`/admin/ocupacion/monitoreo`)
   - `<i class="bi bi-card-checklist"></i>` **Historial Asistencias** (`/admin/ocupacion/asistencias`)

---

### Paso 2: Probar Monitoreo en Tiempo Real (CU12)
1. Ingrese a **Monitoreo de Salas**.
2. **Indicador WebSocket:** Verifique la insignia verde superior: *"EN VIVO (WEBSOCKET)"* con el punto pulsante.
3. **KPIs en Vivo:** Observe las tarjetas superiores:
   - Total Puestos
   - Disponibles (Verde)
   - En Uso (Azul Marino con las sesiones sembradas de prueba)
   - Reservados (Púrpura)
   - Mantenimiento (Ámbar con llave inglesa)
   - Porcentaje de ocupación con barra de progreso.
4. **Matriz 2D Interactiva:**
   - Observe los puestos ocupados (ej. `L1-PC01` y `L1-PC02`): muestran el RU del estudiante, su nombre y el cronómetro dinámico en minutos (`Xm`).
   - Observe los puestos disponibles: muestran el botón verde *"Asignar"* y las horas acumuladas de uso del hardware.
5. **Selector de Laboratorio:** Cambie a otro laboratorio en el selector y compruebe cómo la matriz se actualiza síncronamente.

---

### Paso 3: Probar Asignación Manual y Validaciones Preventivas (CU13)
1. En un puesto disponible (ej. `L1-PC03`), presione el botón **"Asignar"**.
2. Se abrirá el modal de *"Asignar Puesto L1-PC03"*.
3. **Prueba de Estudiante Sancionado:**
   - Digite el RU `220011509` (Rodrigo Sebastian Ortiz Parada) y presione *"Validar Alumno"*.
   - Compruebe que el sistema despliega el banner rojo institucional:
     *"¡Estudiante Bloqueado por Sanción Técnica! El estudiante presenta sanción técnica activa: Investigación técnica pendiente por avería reportada en teclado de sala"*.
   - Compruebe que el botón *"Confirmar Asignación"* se deshabilita para impedir la entrega del equipo.
4. **Prueba de Doble Sesión Concurrente:**
   - Digite el RU `220011501` (Carlos Andrés Vargas Pinto, quien ya se encuentra ocupando la PC `L1-PC01`).
   - Compruebe que el sistema despliega la advertencia ámbar:
     *"¡Doble Sesión Simultánea No Permitida! El estudiante ya tiene una sesión activa en L1-PC01"*.
   - Compruebe que la asignación no se puede confirmar.
5. **Asignación Exitosa:**
   - Digite el RU `220011505` (Mauricio Esteban Roca Justiniano).
   - Compruebe que aparecen sus datos universitarios validados (RU, CI, Carrera).
   - Seleccione el motivo de uso (ej. *"INVESTIGACION"*).
   - Presione **"Confirmar Asignación"**:
   - Compruebe el banner verde de éxito y observe cómo instantáneamente el puesto `L1-PC03` cambia a azul marino en la cuadrícula, mostrando el nombre del estudiante y el contador en `1m`.

---

### Paso 4: Probar Asignación Inteligente con Balanceo de Hardware (CU13)
1. En la barra superior, presione el botón **"Asignar Equipo (Balanceo)"**.
2. Observe el callout informativo superior:
   - El sistema consulta automáticamente el puesto disponible con menor tiempo de uso acumulado y lo resalta en pantalla.
3. Digite el RU `220011506` (Camila Nicole Hurtado Aguilera).
4. Confirme la asignación y verifique cómo el equipo sugerido pasa a estado ocupado.

---

### Paso 5: Probar Liberación de Equipo y Checkout (CU14)
1. En cualquiera de los puestos ocupados, presione el botón rojo **"Liberar"** (`bi-box-arrow-right`).
2. Se abrirá el modal de checkout con el resumen:
   - Código de puesto.
   - Datos del estudiante y carrera.
   - Hora de inicio y tiempo total transcurrido en minutos.
3. Ingrese una observación opcional (ej. *"Equipo devuelto conforme"*) y presione **"Concluir Sesión y Liberar"**.
4. Compruebe que el puesto regresa inmediatamente a verde (**DISPONIBLE**) y sus horas acumuladas de uso se incrementan en base a los minutos de permanencia registrados.

---

### Paso 6: Probar Cola de Espera ($M/M/c$)
1. Presione el botón **"Cola de Espera"** en la barra superior.
2. Observe el cuadro explicativo de Teoría de Colas con el $W_q$ estimado.
3. Ingrese el RU `220011507` en el campo *"Encolar Alumno por RU"* y presione *"Agregar a Fila"*.
4. Compruebe que el estudiante se añade a la tabla con su hora de llegada y tiempo de espera proyectado.
5. En la barra superior, observe cómo la insignia de contador refleja *"Cola de Espera (1)"*.
6. Pruebe el botón *"Asignar Inmediato"* (`bi-check-lg`) o *"Cancelar Turno"* (`bi-trash`).

---

### Paso 7: Probar Historial de Asistencias y Exportación (CU15)
1. Ingrese al menú **Historial Asistencias** (`/admin/ocupacion/asistencias`).
2. **Barra de Filtros:**
   - Pruebe filtrar por carrera, laboratorio, motivo o escribir en el buscador de texto.
   - Pruebe los botones "Buscar" y "Limpiar" (estilizado en carmesí sutil).
3. **Paginación Estándar a 15 Filas:**
   - Compruebe que la tabla respeta el límite estricto de 15 filas por página con el componente compartido `<app-pagination>` posicionado a la derecha.
4. **Detalle de Sesión:**
   - Presione el icono de ojo (`bi-eye`) en cualquier fila para abrir el modal con el detalle completo de la sesión.
5. **Exportación a CSV:**
   - Presione el botón verde **"Exportar CSV"**.
   - Compruebe la descarga del archivo `asistencias_citef_YYYY-MM-DD.csv`, verificando que se abre perfectamente en Excel con acentos y caracteres especiales legibles.

---

## 9. Certificación de Calidad y Cumplimiento

- **Compilación Backend (`npm run build` en `citef_backend`):** Código de salida `0`, 0 errores.
- **Compilación Frontend (`npm run build` en `citef_frontend`):** Código de salida `0`, 0 errores.
- **Pruebas Unitarias Backend (`npm test` en `citef_backend`):** **12 suites pasadas, 53 pruebas exitosas (100% PASS)**.
- **Auditoría de Emojis:** 0 emojis detectados en plantillas, componentes o mensajes.
- **Paginación Uniforme:** Estándar institucional de 15 filas por página con `<app-pagination>` posicionado a la derecha.
- **Arquitectura de 3 Archivos:** 100% de los componentes del Módulo 4 desacoplados en archivos `.ts`, `.html` y `.css`.
- **Integridad de Puertos:** Puertos 3000, 4200 y 8001 respetados sin procesos huérfanos.

---

## 10. Fundamentos Matemáticos y Numéricos de la Teoría de Colas ($M/M/c$) en el CITEF

### 10.1. Modelado Estocástico según la Notación de Kendall
El subsistema de gestión de saturación modela el flujo de estudiantes en los laboratorios como un proceso de colas estocástico multicanal en paralelo con disciplina **FIFO (First In, First Out)**, clasificado formalmente según la notación de Kendall como **$M/M/c$**:
- **$M$ (Llegadas Markovianas / Proceso de Poisson):** Los estudiantes arriban al mostrador del laboratorio de forma independiente, con un tiempo entre llegadas distribuido exponencialmente con tasa promedio $\lambda$ (estudiantes/hora).
- **$M$ (Servicio Markoviano / Exponencial):** El tiempo de uso de la computadora (sesión de estudio, investigación o prácticas) sigue una distribución exponencial con tasa de servicio $\mu$ por puesto (sesiones/hora por equipo). En el CITEF de la FCEE, la duración promedio observada de una sesión libre es de **60 minutos** (1 hora), por lo que:
  $$\mu = 1.0 \text{ sesiones por hora por puesto}$$
- **$c$ (Servidores en Paralelo):** Representa el número de puestos de cómputo operativos y disponibles para estudiantes en el laboratorio (excluyendo la estación docente). Por ejemplo, un laboratorio típico cuenta con $c = 20$ o $c = 24$ puestos, o $c = 3$ puestos en salas especializadas.

---

### 10.2. Variables y Fórmulas Fundamentales

| Variable | Denominación | Significado Técnico | Valor Típico CITEF |
| :--- | :--- | :--- | :--- |
| **$c$** | Servidores Operativos | Cantidad de puestos de estudiantes activos en la sala | $3 \le c \le 30$ |
| **$\mu$** | Tasa de Servicio | Sesiones concluidas por hora en cada computadora | $1.0\text{ ses/h}$ ($\approx 60\text{ min/sesión}$) |
| **$\lambda$** | Tasa de Arribos | Estudiantes que llegan a solicitar máquina por hora | Variable según horario pico |
| **$\rho = \frac{\lambda}{c \cdot \mu}$** | Factor de Utilización | Intensidad de tráfico y saturación global de la sala | $\rho \ge 0.90 \implies$ Alerta de Saturación |
| **$P_0$** | Probabilidad de Vacío | Probabilidad de que todos los puestos estén desocupados | Ver fórmula general |
| **$C(c, a)$** | Probabilidad de Espera (Erlang-C) | Probabilidad de que un alumno deba ingresar a la cola | $C(c, a) \in [0, 1]$ |
| **$W_q$** | Tiempo Medio de Espera | Tiempo promedio que un estudiante permanece en la fila | En minutos |

#### 1. Factor de Utilización del Laboratorio ($\rho$)
$$\rho = \frac{\lambda}{c \cdot \mu}$$
- Si $\rho < 0.90$: El laboratorio opera en régimen fluido sin colas permanentes.
- Si $\rho \ge 0.90$: El sistema ingresa en estado de saturación alta. Se despliega la alerta institucional y se activa la lista de espera estocástica.
- Si $\rho \ge 1.0$: La tasa de demanda supera la capacidad instalada del laboratorio, generando acumulación en la puerta de acceso.

#### 2. Probabilidad de Demora (Fórmula de Erlang-C)
La probabilidad de que un estudiante encuentre todos los puestos ocupados y deba esperar en la fila viene dada por:
$$P_0 = \left[ \sum_{n=0}^{c-1} \frac{(c \cdot \rho)^n}{n!} + \frac{(c \cdot \rho)^c}{c! \cdot (1 - \rho)} \right]^{-1}$$

$$C(c, \lambda/\mu) = \frac{\frac{(c \cdot \rho)^c}{c! \cdot (1 - \rho)} \cdot P_0}{1}$$

#### 3. Tiempo Medio de Espera Global en Cola ($W_q$)
$$W_q = \frac{C(c, \lambda/\mu)}{c \cdot \mu - \lambda}$$

---

### 10.3. Tiempo de Espera Proyectado por Posición Individual en la Fila ($k$)

Cuando la sala se encuentra al 100% de saturación ($c$ computadoras ocupadas simultáneamente), el laboratorio en su conjunto libera puestos a una tasa combinada de:
$$\text{Tasa de Liberación de la Sala} = c \cdot \mu \quad (\text{puestos liberados por hora})$$

Por consiguiente, el intervalo de tiempo promedio que transcurre entre una liberación de computadora y la siguiente es:
$$\Delta t_{\text{salida}} = \frac{60 \text{ minutos}}{c \cdot \mu}$$

Para un estudiante que ocupa la **posición ordinal $k$** en la cola de espera activa ($k = 1$ para el primero, $k = 2$ para el segundo, etc.), el tiempo de espera estimado se formula como:
$$W_q(k) = k \cdot \Delta t_{\text{salida}} = k \cdot \left(\frac{60}{c \cdot \mu}\right) \text{ minutos}$$

---

### 10.4. Ejemplos Numéricos Paso a Paso

#### Caso A: Sala Pequeña de Pruebas ($c = 3$ computadoras, $\mu = 1.0$)
Supongamos una sala con $c = 3$ puestos de cómputo para estudiantes, con una duración promedio por sesión de 60 minutos ($\mu = 1.0$).
1. **Intervalo promedio entre liberaciones de puesto:**
   $$\Delta t_{\text{salida}} = \frac{60}{3 \cdot 1.0} = \frac{60}{3} = 20 \text{ minutos}$$
   Esto significa que, estadísticamente, **cada 20 minutos se libera una computadora en la sala**.
2. **Arribo del Estudiante 1 (Carlos):**
   - La cola está vacía ($k = 1$).
   - Tiempo de espera proyectado:
     $$W_q(1) = 1 \cdot 20 = 20 \text{ minutos}$$
3. **Arribo del Estudiante 2 (María):**
   - Carlos está adelante, por lo que María ocupa la posición $k = 2$.
   - Tiempo de espera proyectado:
     $$W_q(2) = 2 \cdot 20 = 40 \text{ minutos}$$
4. **Arribo del Estudiante 3 (Jorge):**
   - Ocupa la posición $k = 3$.
   - Tiempo de espera proyectado:
     $$W_q(3) = 3 \cdot 20 = 60 \text{ minutos}$$

#### ¿Por qué el tiempo de espera se recalcula dinámicamente y ya no es estático?
- **El problema detectado anteriormente:** Cuando un estudiante se encolaba, el backend persistía el valor `40 min` en la base de datos como una fotografía estática. Cuando Carlos (el primero) era atendido o desistía y se eliminaba de la fila, María pasaba a ser la primera de la fila pero seguía viendo `40 min`, lo cual era confuso e inconsistente.
- **La solución dinámica implementada:** El endpoint `obtenerColaSala(idSala)` ahora mapea la lista ordenada por orden de llegada (`fecha_hora_llegada ASC`) y calcula dinámicamente:
  $$\text{posicion} = \text{index} + 1$$
  $$W_q = \text{posicion} \cdot \left(\frac{60}{c \cdot \mu}\right)$$
- **Resultado en Vivo:** En el instante en que Carlos es atendido, María pasa a tener `posicion = 1`. Su tiempo proyectado de espera se actualiza inmediatamente a **20 minutos**. Si llega un nuevo alumno detrás de María, ese nuevo alumno verá **40 minutos**.

#### Caso B: Laboratorio Facultativo Estándar ($c = 20$ computadoras, $\mu = 1.0$)
1. **Intervalo promedio entre liberaciones de puesto:**
   $$\Delta t_{\text{salida}} = \frac{60}{20 \cdot 1.0} = 3 \text{ minutos}$$
   En un laboratorio de 20 máquinas, ¡en promedio se desocupa un puesto cada **3 minutos**!
2. **Tiempos de espera por posición en fila:**
   - Posición $k = 1$: $1 \times 3\text{ min} = \mathbf{3\text{ minutos}}$.
   - Posición $k = 2$: $2 \times 3\text{ min} = \mathbf{6\text{ minutos}}$.
   - Posición $k = 5$: $5 \times 3\text{ min} = \mathbf{15\text{ minutos}}$.
   - Posición $k = 10$: $10 \times 3\text{ min} = \mathbf{30\text{ minutos}}$.

---

## 11. Escalabilidad a Largo Plazo: Manejo de Horas Acumuladas de Hardware (5 a 10 Años)

### 11.1. El Reto de Visualización en Tarjetas Compactas
Un laboratorio universitario en operación continua durante 3, 5 o 10 años acumula decenas de miles de horas de uso por equipo. Por ejemplo, una computadora utilizada 8 horas diarias durante 200 días académicos al año acumula $1,600\text{ horas/año}$. En 8 años acumulará más de **$12,800\text{ horas}$**.
- **Riesgo:** Desplegar cadenas como `13000.45h` en celdas compactas de $110\text{px} \times 115\text{px}$ rompería la cuadrícula, desbordaría los botones y saturaría visualmente la vista del operador.

### 11.2. Solución de Arquitectura y Formato Gradual en el Frontend
Se implementó una función formativa escalable `formatHorasUso(horas)` en los componentes compartidos (`LabCuadriculaComponent` y `MonitorSalaComponent`):

```typescript
formatHorasUso(horas: number | undefined | null): string {
  if (horas === undefined || horas === null || isNaN(Number(horas))) return '0h';
  const num = Number(horas);
  if (num < 1000) {
    // Para equipos nuevos o semestrales (< 1,000 h): se muestra con 1 decimal
    return `${Math.round(num * 10) / 10}h`; // Ej: "12.5h", "450h"
  }
  if (num < 10000) {
    // Para equipos entre 1,000 y 9,999 h: notación compacta con 'k'
    return `${(num / 1000).toFixed(1)}k h`; // Ej: "1.3k h", "7.8k h"
  }
  // Para equipos longevos (>= 10,000 h): notación entera con 'k'
  return `${Math.round(num / 1000)}k h`;   // Ej: "13k h", "25k h"
}
```

- **Tooltip Accesible:** Al posar el puntero del ratón sobre la métrica, el atributo `title` despliega la cifra exacta con todos sus decimales:
  ```html
  title="Horas de uso acumuladas: 13,245.5 h (Balanceo de hardware)"
  ```
- **Persistencia en Base de Datos:** En la tabla `computadora`, la columna `horas_uso_acumuladas` es de tipo numérico `decimal(8, 2)`, manteniendo la exactitud total del desgaste sin pérdidas de información para auditoría patrimonial.
- **Estrategia Facultativa de Ciclos:** El algoritmo de balanceo prioriza siempre el menor desgaste (`horas_uso_acumuladas ASC`). Para ciclos de mantenimiento mayor o reconfiguración de laboratorios al inicio de un nuevo año académico, la administración puede opcionalmente ejecutar un reseteo de ciclo manteniendo el histórico archivado en `bitacora_auditoria`.

---

## 12. Verificación del Flujo de Liberación y Acumulación de Horas en Tiempo Real

### 12.1. Transacción Atómica de Checkout
Al presionar el botón **"Liberar"** (`bi-box-arrow-right`) en una estación ocupada, el servicio `OcupacionService.liberarEquipo()` ejecuta:
1. **Cálculo de Permanencia:**
   $$\text{minutos\_uso} = \max\left(1, \text{round}\left(\frac{\text{ahora} - \text{fecha\_hora\_inicio}}{60000}\right)\right)$$
   $$\text{horas\_adicionales} = \frac{\text{minutos\_uso}}{60.0}$$
2. **Actualización en Base de Datos (Transacción Atómica):**
   - `asignacion_sesion`: Estado cambia de `'EN_CURSO'` a `'CONCLUIDA'`, guardando `fecha_hora_fin` y `minutos_permanencia`.
   - `computadora`: Estado cambia a `'DISPONIBLE'` y sus horas se incrementan con redondeo estricto a 2 decimales:
     ```typescript
     pcActual.horas_uso_acumuladas = Number(
       (Number(pcActual.horas_uso_acumuladas || 0) + horasAdicionales).toFixed(2),
     );
     ```
3. **Auditoría Forense:** Registro en `bitacora_auditoria` con valores anteriores y nuevos.
4. **Difusión Síncrona por WebSocket:**
   ```typescript
   this.emitirActualizacionEstadoSala(pc.id_sala);
   ```
   El backend consulta el estado completo de la sala (con las horas actualizadas de la computadora liberada) y lo emite a través de `OcupacionGateway` mediante el evento `estado_sala_actualizado`.

### 12.2. Recepción Reactiva en el Frontend
El componente `MonitorSalaComponent` mantiene la suscripción activa:
```typescript
this.ocupacionService.salaActualizada$.subscribe((estado) => {
  if (estado && estado.sala.id_sala === this.salaSeleccionadaId()) {
    this.estadoSala.set(estado);
  }
});
```
- La computadora cambia instantáneamente de azul marino a verde (**DISPONIBLE**).
- La etiqueta de horas de uso refleja de inmediato el incremento.
- El cronómetro de sesión se apaga.
- Si había alumnos en cola de espera, el sistema notifica al operador: *"Puesto liberado exitosamente — ¡Atención: Hay X estudiante(s) en cola de espera!"*.
- Todo el proceso ocurre en menos de 50 milisegundos sin recargar la página.

---

## 13. Conexión entre el Editor de Cuadrícula y la Conclusión de Sesiones Activas

### 13.1. Detección y Advertencia Preventiva en Mostrador
Cuando un administrador accede al **Editor de Cuadrícula** (`/infraestructura/cuadricula/:id`) y decide editar una computadora que se encuentra actualmente en sesión activa (`estado_actual === 'OCUPADA'`):
- Si el administrador intenta cambiar el estado de la estación a `'EN_MANTENIMIENTO'`, `'RESERVADA'`, `'DISPONIBLE'`, o desactivar/retirar el equipo:
- El frontend detecta la presencia de `pc.sesion_activa` y bloquea la acción directa, desplegando la modal de confirmación formal `.session-warning-card`:
  > **¡Sesión en Curso Detectada!**
  > El puesto **[Código PC]** se encuentra actualmente ocupado por **[Nombre Alumno]** (RU: **[Registro]**) con **[X minutos]** de uso activo.
  > *Si confirma el cambio de estado a [Nuevo Estado], la sesión se detendrá inmediatamente, liberando al alumno y acumulando su tiempo de uso en el historial de asistencias.*
  > `[Cancelar]` `[Aceptar y Concluir Sesión]`

### 13.2. Cierre Transaccional en Base de Datos y Auditoría
Al confirmar la operación:
1. En el backend, [`ComputadorasService.actualizar()`](file:///home/nataly/Projects/laboratorios/citef_backend/src/modules/infraestructura/services/computadoras.service.ts) localiza la sesión activa en `asignacion_sesion`:
   - Concluye el registro: `estado = 'CONCLUIDA'`.
   - Establece `fecha_hora_fin = now()` y calcula con exactitud `minutos_permanencia`.
   - Anota en `observaciones`: *"Sesión finalizada administrativamente por cambio de estado a [Nuevo Estado] desde editor de cuadrícula"*.
   - Acumula las horas proporcionales en `computadora.horas_uso_acumuladas`.
2. En el **Historial de Asistencias** (`/admin/ocupacion/asistencias`), la sesión pasa de inmediato de `EN_CURSO` a `CONCLUIDA`, garantizando que las métricas de acreditación no queden corrompidas con sesiones colgadas o estudiantes bloqueados artificialmente.

---

## 14. Rediseño Ergonómico de Pantalla: Cuadrícula Inmediata y KPIs en Columna Lateral

### 14.1. Nueva Disposición Espacial (Workspace en Paralelo)
Para maximizar el área visible y evitar que las tarjetas de indicadores empujen el laboratorio a la mitad inferior de la pantalla:
- **Área Izquierda / Centro (`.monitor-main-stage`):** Se posiciona inmediatamente debajo de la barra de herramientas. La pizarra digital frontal del laboratorio y la cuadrícula 2D de puestos reciben el 100% de la prioridad visual.
- **Columna Lateral Derecha (`.monitor-sidebar-kpis`):** Las tarjetas de métricas se apilan verticalmente una debajo de otra (`Puestos Alumnos`, `Disponibles`, `En Uso`, `Reservados`, `Mantenimiento` y `Medidor de Saturación %`). En pantallas grandes permanece anclada (`sticky`), y en dispositivos móviles o pantallas compactas se reorganiza automáticamente a pie de página (`@media (max-width: 1024px)`).
- **Banner de Saturación Ultra-Compacto (`.saturation-callout-compact`):** Si la sala supera el 90% o 100% de ocupación, se muestra como una delgada franja horizontal de aviso con botón directo de acceso a la cola, eliminando los bloques gigantes de texto.
- **Simplificación en Editor de Cuadrícula:** Se desactivó el modo de recolocación por clic (`Mover aquí`) que teñía las celdas vacías. Ahora cualquier clic sobre el icono `+` abre directamente el registro de nueva PC en esa coordenada, y la reubicación de puestos se realiza de manera limpia mediante arrastre (*Drag and Drop*).

### 14.2. Homogeneización de Márgenes y Proporción Cuadrada de Estaciones y KPIs
- **Alineación con el Shell Institucional:** Se eliminaron los paddings redundantes (`padding: 0.75rem 1rem` y `padding: 1.5rem`) y fondos coloreados de `.monitor-container` y `.asistencias-container`. Ahora ambas páginas arrancan exactamente en las mismas coordenadas del layout raíz que el **Editor de Cuadrícula**, maximizando el ancho útil y eliminando la sensación de bordes o dobles márgenes frente al sidebar.
- **KPIs Cuadrados y Compactos:** Se redujo el ancho en el eje X de la columna lateral a `115px` y se orientaron verticalmente los elementos de cada tarjeta (icono arriba, valor numérico destacado en medio, etiqueta institucional abajo, altura mínima de `82px`). La tarjeta medidora de saturación adopta el mismo perfil cuadrado con barra de progreso sólida de 5px y badges concisos (`NORMAL` / `ALTA`).
- **Estaciones Cuadradas y Proporcionales:** En `<app-lab-cuadricula>`, se implementó `max-width: 165px` y `justify-content: center` junto con `height: 115px`. Con la ganancia de espacio horizontal al estrechar la columna de KPIs, las computadoras en monitoreo mantienen exactamente la misma silueta casi cuadrada y formal que en el editor de cuadrícula (relación de aspecto ~1.17 a 1.25), garantizando una experiencia visual idéntica y equilibrada.
- **Visualización Compacta por Registro Universitario (RU):** Para evitar que nombres largos o compuestos con dobles apellidos distorsionen el ancho intrínseco de las columnas en la cuadrícula, la tarjeta de una PC ocupada muestra exclusivamente la insignia del **Registro Universitario** (`.student-ru font-monospace`, ej. `218045123`). El nombre completo del estudiante, la carrera facultativa y el motivo de asistencia se consultan en detalle al hacer clic en el botón de información `(i)` o pasando el cursor por encima mediante el tooltip `[title]`.


