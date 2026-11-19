# MÓDULO 3: INFRAESTRUCTURA Y EQUIPAMIENTO DE LABORATORIOS - CITEF FCEE UAGRM
**Documento Técnico de Implementación y Guía Exhaustiva de Verificación**

---

## 1. Resumen Ejecutivo del Módulo 3

El **Módulo 3 (Infraestructura y Equipamiento de Laboratorios)** gestiona la capacidad física, tecnológica y espacial de las salas de cómputo del Centro de Información y Tecnología (**CITEF**) de la Facultad de Ciencias Económicas y Empresariales (**FCEE**) de la **UAGRM**.

El módulo cubre de manera integral los casos de uso **CU9, CU10, CU11 y CU12**, ofreciendo una solución de vanguardia que combina:
1. **Modelado Espacial 2D Interactivo:** Visualización y edición matricial ($F \times C$) de las salas con soporte de drag & drop y reubicación por clic.
2. **Actualización Segura en Dos Fases (Two-Phase Grid Swap):** Algoritmo en base de datos para intercambiar o reubicar puestos de cómputo sin colisiones de clave única `UNIQUE(id_sala, posicion_fila, posicion_columna)`.
3. **Gestión Dual de Periféricos y Mini-Mapa Asistido:** Control patrimonial de periféricos con asignación directa a puestos de cómputo o resguardo en bodega de almacén, complementado con un mini-mapa interactivo de la sala al 50% de escala dentro del modal para que los auxiliares identifiquen de inmediato la ubicación física del equipo.
4. **Paleta Institucional de Alto Contraste y Cero Emojis:** Sistema visual formal con diferenciación cromática nítida para todos los estados operativos, destacando la llave inglesa para Mantenimiento, el morado índigo para Reservada y el carmesí institucional para la Estación Docente.
5. **Arquitectura Limpia Angular 18:** Desacoplamiento estricto de componentes en 3 archivos independientes (`.ts`, `.html`, `.css`), paginación estándar de 15 filas, validaciones en letras rojas institucionales y control de acceso granular RBAC con auditoría forense transaccional.

---

## 2. Casos de Uso Implementados y Arquitectura de Datos

| Caso de Uso | Denominación | Detalle de la Solución Técnica |
| :--- | :--- | :--- |
| **CU9** | **Gestionar salas de cómputo / laboratorios** | Catálogo físico de salas con especificación de pabellón, piso, capacidad de estudiantes, dimensiones de cuadrícula ($F \times C$), amenidades (máquina docente, proyector, aire acondicionado) y estado operativo (`OPERATIVA`, `EN_MANTENIMIENTO`, `CERRADA`). Desactivación lógica que transiciona automáticamente el estado a `CERRADA` y excluye la sala de los selectores operativos y del editor de cuadrícula. Tabla estilizada con paginación estándar de 15 filas y bitácora de auditoría. |
| **CU10** | **Configurar cuadrícula de laboratorio** | Editor visual matricial 2D reactivo que refleja la distribución física de la sala. Incluye pódium/pizarra frontal, leyenda cromática de 5 estados, soporte de arrastrar y soltar (drag & drop), selección y reubicación por clic en celdas vacías, atajo de creación directa de nueva PC haciendo clic en celdas vacías con coordenadas precargadas, selector de sala compacto por código, y barra de herramientas con botones "Nueva PC" y "Guardar Distribución" en una sola fila. |
| **CU11** | **Control de puestos de cómputo** | Alta, edición, reubicación y desincorporación de estaciones de cómputo (`computadora`). Control de código patrimonial único, dirección IP de red, horas de uso acumuladas, flag de máquina docente y estado operativo (`DISPONIBLE`, `OCUPADA`, `RESERVADA`, `EN_MANTENIMIENTO`). Validación visual en rojo en modales y registro forense en bitácora. |
| **CU12** | **Inventario de periféricos y componentes** | Control de hardware patrimonial (monitores, teclados, mouse, CPU, UPS, etc.) con número de activo único y tipo de componente. Manejo de estado físico de 4 niveles (`BUENO`, `REGULAR`, `DANADO`, `FALTANTE`) con colores de alto contraste e iconos vectoriales. Ubicación dinámica dual: asignado a una PC específica o disponible en bodega de almacén (`id_computadora = NULL`). Modal de reasignación asistido con mini-mapa interactivo de la sala para auxiliares y administradores. |

---

## 3. Decisiones Arquitectónicas Clave

### 3.1. Algoritmo de Actualización en Dos Fases (Two-Phase Grid Swap)
- **Problema previo:** La tabla `computadora` posee una restricción de unicidad estricta `UNIQUE(id_sala, posicion_fila, posicion_columna)`. Al mover puestos o intercambiar computadoras arrastrándolas entre celdas, el motor PostgreSQL rechazaba la transacción con error `duplicate key value violates unique constraint` antes de concluir la operación completa.
- **Solución implementada:**
  - En `ComputadorasService.actualizarDistribucion()`, se implementó una transacción atómica administrada mediante `QueryRunner`.
  - **Fase 1 (Inversión a coordenadas virtuales temporales):** Todos los puestos a mover se actualizan a coordenadas negativas (`posicion_fila = -nueva_fila`, `posicion_columna = -nueva_columna`), liberando instantáneamente las coordenadas espaciales positivas en el índice único de PostgreSQL.
  - **Fase 2 (Normalización a coordenadas reales positivas):** Se restablecen las coordenadas a su valor positivo definitivo.
  - Se confirma la transacción mediante `queryRunner.commitTransaction()`, garantizando atomicidad y cero conflictos de integridad.

### 3.2. Selector Compacto y Botones Alineados en el Editor de Cuadrícula
- **Problema previo:** El selector de laboratorio mostraba nombres largos que desbordaban la barra superior (`toolbar`), desplazando los botones de acción a múltiples filas y degradando la experiencia de usuario. Además, las salas desactivadas continuaban apareciendo en el editor.
- **Solución implementada:**
  - El `<select>` de laboratorio ahora muestra únicamente el código identificador de la sala (ej. `LAB-01`, `LAB-02`, `AULA-41`), manteniendo el nombre completo en el tooltip descriptivo (`title`).
  - La barra superior organiza los controles en dos bloques equilibrados (`toolbar-left` y `toolbar-right`): selector de sala, badges informativos de capacidad, botón "Nueva PC", botón "Descartar" y botón "Guardar Distribución", todos en una sola fila compacta y armónica.
  - El backend y el frontend filtran únicamente las salas activas (`activo = true` y estado diferente de `CERRADA`), excluyendo salas clausuradas del editor de cuadrícula.

### 3.3. Creación Rápida de Puestos desde Celdas Vacías
- **Problema previo:** Para registrar una PC en una posición específica, el administrador debía memorizar o anotar la fila y columna y digitarlas manualmente en el modal.
- **Solución implementada:**
  - Al hacer clic en cualquier celda vacía `(+)` de la matriz 2D, el sistema abre directamente el modal de registro precargando automáticamente la fila (Y) y columna (X) seleccionadas.
  - Si el usuario tiene una PC seleccionada para mover, el clic en la celda vacía ejecuta la reubicación en caliente en lugar de abrir el formulario.

### 3.4. Mini-Mapa Interactivo en el Modal de Reubicación de Periféricos
- **Problema previo:** Cuando un auxiliar o técnico reasignaba un periférico a una máquina (ej. "Reubicar Teclado"), el desplegable plano de computadoras (ej. `L1-PC18`) no proporcionaba noción espacial de dónde se encontraba físicamente el equipo en el laboratorio, induciendo a errores de asignación.
- **Solución implementada:**
  - Al seleccionar un laboratorio de destino en el modal de edición/reubicación, se renderiza reactivamente un **mini-mapa al 50% de escala** de la cuadrícula física de dicha sala.
  - El mini-mapa muestra todas las computadoras operativas dispuestas en sus filas y columnas reales, con bordes y badges claros.
  - El usuario puede hacer clic directamente sobre cualquier máquina del mini-mapa para seleccionarla como destino del periférico, sincronizándose de forma bidireccional con el formulario de guardado.

### 3.5. Calibración de Permisos RBAC Granular para Auxiliares
- **Problema previo:** Los auxiliares con permiso de inventario (`INFRA_INVENTARIO_GESTIONAR`) recibían error `403 Forbidden` al abrir el modal de reubicación, debido a que los endpoints de listado de salas (`GET /salas`) y computadoras (`GET /computadoras/sala/:id`) exigían permisos de administración de salas (`INFRA_SALAS_GESTIONAR`).
- **Solución implementada:**
  - Se calibraron los controladores NestJS (`SalasController` y `ComputadorasController`) otorgando acceso de lectura compartido al permiso `INFRA_INVENTARIO_GESTIONAR`.
  - El auxiliar puede consultar la topología de salas y equipos para reubicar periféricos sin violar la granularidad RBAC y sin concederle permisos para alterar la estructura de las salas.

### 3.6. Arquitectura de 3 Archivos Separados en Angular 18
- Todos los componentes del Módulo 3 fueron estructurados bajo la directriz de separación estricta:
  - `salas.component.ts`, `salas.component.html`, `salas.component.css`
  - `editor-cuadricula.component.ts`, `editor-cuadricula.component.html`, `editor-cuadricula.component.css`
  - `inventario-perifericos.component.ts`, `inventario-perifericos.component.html`, `inventario-perifericos.component.css`
- Eliminación total de plantillas y estilos inline, garantizando modularidad, mantenibilidad y facilidad de prueba.

---

## 4. Paleta de Colores y Simbología de Alto Contraste

Para cumplir con la directriz de intensificar el contraste visual sin saturación excesiva y distinguir inequívocamente cada estado operativo, se aplicó la siguiente jerarquía cromática y simbólica:

### 4.1. Estaciones de Cómputo en la Cuadrícula 2D
| Estado / Tipo | Color de Acento | Fondo con Gradiente | Icono Vectorial Bootstrap | Propósito y Semántica |
| :--- | :--- | :--- | :--- | :--- |
| **DISPONIBLE** | Verde Bosque (`#16A34A`) | `linear-gradient(#ffffff 45%, #dcfce7 100%)` | `<i class="bi bi-display"></i>` | Equipo listo para asignación inmediata. |
| **OCUPADA** | Azul Marino FCEE (`#002855`) | `linear-gradient(#ffffff 45%, #dbeafe 100%)` | `<i class="bi bi-display"></i>` | Estación con sesión de estudiante activa en turno. |
| **RESERVADA** | Púrpura / Índigo (`#7C3AED`) | `linear-gradient(#ffffff 45%, #ede9fe 100%)` | `<i class="bi bi-calendar-check-fill"></i>` | Bloqueada preventivamente para una reserva académica. |
| **EN MANTENIMIENTO** | Ámbar / Naranja Oscuro (`#EA580C`) | `linear-gradient(#ffffff 45%, #ffedd5 100%)` | `<i class="bi bi-wrench-adjustable-circle-fill"></i>` | Equipo fuera de servicio con símbolo formal de llave inglesa. |
| **ESTACIÓN DOCENTE** | Carmesí FCEE Intenso (`#A81124`) | `linear-gradient(#ffffff 40%, #fee2e2 100%)` | `<i class="bi bi-person-workspace"></i>` | Puesto principal del docente, con borde reforzado de 2.5px. |

### 4.2. Estados de Salas de Cómputo
- **Operativa:** Insignia verde esmeralda sólida (`#15803D`), fondo `#DCFCE7`, borde `1.5px solid #16A34A`, con `<i class="bi bi-check-circle-fill"></i>`.
- **En Mantenimiento:** Insignia ámbar intensa (`#B45309`), fondo `#FEF3C7`, borde `1.5px solid #F59E0B`, con llave inglesa `<i class="bi bi-wrench-adjustable"></i>`.
- **Cerrada:** Insignia carmesí institucional (`#991B1B`), fondo `#FEE2E2`, borde `1.5px solid #DC2626`, con `<i class="bi bi-slash-circle-fill"></i>`.

### 4.3. Estado Físico de Periféricos (CU12)
- **Bueno:** Verde de alto contraste (`.citef-badge-success`) con `<i class="bi bi-check-circle-fill"></i> Bueno`.
- **Regular (Prevención):** Ámbar institucional de alerta preventiva (`.citef-badge-warning`) con `<i class="bi bi-shield-exclamation"></i> Regular (Prevención)`.
- **Dañado:** Carmesí FCEE (`.citef-badge-danger`) con `<i class="bi bi-x-circle-fill"></i> Dañado`.
- **Faltante:** Gris azulado neutro de contraste (`.citef-badge-neutral`) con `<i class="bi bi-question-circle-fill"></i> Faltante`.

### 4.4. Ubicación de Periféricos
- **Asignado a PC:** Insignia azul cian (`#002855`), fondo `#E0F2FE`, borde sólido `1.5px solid #0284C7` con `<i class="bi bi-display"></i>`.
- **En Bodega:** Insignia gris pizarra (`#334155`), fondo `#F1F5F9`, borde sólido `1.5px solid #94A3B8` con `<i class="bi bi-archive-fill"></i>`.

---

## 5. Cumplimiento de Directrices y Reglas Inviolables

1. **Cero Emojis:** Todos los botones, iconos de estado, cabeceras y tarjetas emplean exclusivamente la librería vectorial **Bootstrap Icons** (`<i class="bi bi-*"></i>`).
2. **Paleta FCEE Institucional:** Rojo Carmesí institucional (`#A81124`) y Azul Marino (`#002855`) como colores primarios, complementados con tonos de alta legibilidad para badges técnicos.
3. **Paginación Estándar de 15 Filas:** Todas las tablas (`salas`, `inventario-perifericos`) implementan paginación interactiva limitada estrictamente a **15 registros por página**, con controles posicionados en la esquina inferior derecha mediante el componente compartido `<app-pagination>`.
4. **Reutilización Obligatoria de Componentes Compartidos:**
   - `<app-table-card>`: Contenedor institucional de tablas con título, subtítulo dinámico y barra de acciones.
   - `<app-pagination>`: Paginador estándar con leyenda `X–Y de Z` y botones interactivos.
   - `<app-modal-alert>`: Banner institucional de error que se mantiene dentro del modal ante rechazos del backend.
   - `<app-confirm-modal>`: Diálogo de confirmación para bajas lógicas y retiros de equipos para evitar pérdidas accidentales.
5. **Validación Visual en Letras Rojas:**
   - Mensajes específicos en letras rojas institucionales (`#DC2626`) debajo de cada campo obligatorio o inválido (`.field-error-text`).
   - Borde resaltado en rojo (`.input-error`) en los inputs correspondientes.
6. **Estandarización de Acciones y Botones:**
   - Botón "Limpiar" estilizado uniformemente con carmesí sutil.
   - Botones "Cancelar" en todos los modales estilizados con carmesí institucional.
   - Acciones por fila obligatorias: lápiz (`bi-pencil`) para editar, basurero (`bi-trash`) para dar de baja, y cuadrícula (`bi-grid-3x3`) para acceder a la distribución 2D.
7. **Sidebar Reactivo RBAC Dinámico:**
   - `INFRA_SALAS_GESTIONAR` $\rightarrow$ Salas y Laboratorios (`/admin/infraestructura/salas`).
   - `INFRA_INVENTARIO_GESTIONAR` $\rightarrow$ Inventario de Periféricos (`/admin/infraestructura/perifericos`).
8. **Auditoría Forense y Logs de Servidor:**
   - Registro automático en `bitacora_auditoria` con valores anteriores y nuevos en JSONB para cada operación (`INSERT_SALA`, `UPDATE_SALA`, `UPDATE_GRID`, `INSERT_PC`, `UPDATE_PC`, `DELETE_PC`, `INSERT_PERIFERICO`, `UPDATE_PERIFERICO`, `DELETE_PERIFERICO`).
   - Trazabilidad HTTP en tiempo real con `HttpLoggerMiddleware`.
9. **Compilación Limpia:** Frontend y backend compilan con **0 errores** (`exit code 0`).

---

## 6. Inventario de Archivos Creados y Modificados

### A. Base de Datos y Modelo UML
| Archivo / Objeto | Tipo | Descripción |
| :--- | :--- | :--- |
| `sala` | Tabla PostgreSQL | Catálogo de salas con pabellón, piso, capacidad, dimensiones ($F \times C$) y amenidades. |
| `computadora` | Tabla PostgreSQL | Puestos de cómputo con clave única `(id_sala, posicion_fila, posicion_columna)`. |
| `periferico` | Tabla PostgreSQL | Hardware patrimonial vinculado a `computadora` (o `NULL` para bodega). |
| `historial_ubicacion_periferico` | Tabla PostgreSQL | Trazabilidad histórica de movimientos de periféricos entre puestos y bodega. |
| `DiagramasUML.eapx` | Modelo UML (EA) | Clases `Sala`, `Computadora`, `Periferico`, `HistorialUbicacionPeriferico` y casos de uso CU9, CU10, CU11, CU12 en Enterprise Architect. |

### B. Backend (`citef_backend/`)
| Archivo | Tipo | Descripción |
| :--- | :--- | :--- |
| `src/modules/infraestructura/infraestructura.module.ts` | Módulo NestJS | Integración de entidades, servicios y controladores del Módulo 3. |
| `src/modules/infraestructura/entities/sala.entity.ts` | Entidad TypeORM | Modelo de salas de cómputo con relaciones hacia computadoras y auditoría. |
| `src/modules/infraestructura/entities/computadora.entity.ts` | Entidad TypeORM | Modelo de puestos de cómputo con relaciones hacia periféricos y sala. |
| `src/modules/infraestructura/entities/periferico.entity.ts` | Entidad TypeORM | Modelo de periféricos con soporte de bodega y asignación a computadora. |
| `src/modules/infraestructura/entities/historial-ubicacion-periferico.entity.ts` | Entidad TypeORM | Modelo de auditoría de traslados de hardware. |
| `src/modules/infraestructura/controllers/salas.controller.ts` | Controlador REST | Endpoints para CRUD de salas, actualización de cuadrícula y acceso compartido RBAC. |
| `src/modules/infraestructura/controllers/computadoras.controller.ts` | Controlador REST | Endpoints para puestos de cómputo, reubicación y distribución matricial. |
| `src/modules/infraestructura/controllers/perifericos.controller.ts` | Controlador REST | Endpoints para inventario, asignación a puestos, retorno a bodega y reubicación. |
| `src/modules/infraestructura/services/salas.service.ts` | Servicio | Lógica de negocio de salas, validación de capacidad y baja lógica con estado `CERRADA`. |
| `src/modules/infraestructura/services/computadoras.service.ts` | Servicio | Transacción Two-Phase Update para actualización de cuadrícula sin colisión de índice único. |
| `src/modules/infraestructura/services/perifericos.service.ts` | Servicio | Gestión de inventario patrimonial, reubicación y trazabilidad en historial. |
| `src/modules/infraestructura/services/salas.service.spec.ts` | Pruebas Unitarias | Tests unitarios para creación, listado y cambio de estado de salas. |
| `src/modules/infraestructura/services/computadoras.service.spec.ts` | Pruebas Unitarias | Tests unitarios para puestos de cómputo y transacciones de cuadrícula. |
| `src/modules/infraestructura/services/perifericos.service.spec.ts` | Pruebas Unitarias | Tests unitarios para inventario y movimientos de hardware. |

### C. Frontend (`citef_frontend/`)
| Archivo | Tipo | Descripción |
| :--- | :--- | :--- |
| `src/app/core/services/infraestructura.service.ts` | Servicio Angular | Cliente HTTP completo para salas, cuadrícula, computadoras y periféricos. |
| `src/app/pages/infraestructura/salas/salas.component.ts` | Vista UI (CU9) | Controlador de vista de laboratorios, filtros, modales y paginación a 15 filas. |
| `src/app/pages/infraestructura/salas/salas.component.html` | Plantilla HTML | Tabla estilizada, badges con llave inglesa para Mantenimiento y modales reactivos. |
| `src/app/pages/infraestructura/salas/salas.component.css` | Hoja de Estilos | Estilos desacoplados para la gestión de salas de cómputo. |
| `src/app/pages/infraestructura/editor-cuadricula/editor-cuadricula.component.ts` | Vista UI (CU10/CU11) | Controlador de la matriz 2D, lógica de drag & drop, clic en celdas y atajo nueva PC. |
| `src/app/pages/infraestructura/editor-cuadricula/editor-cuadricula.component.html` | Plantilla HTML | Matriz 2D dinámica, pódium frontal, leyenda de 5 estados y modal de equipo. |
| `src/app/pages/infraestructura/editor-cuadricula/editor-cuadricula.component.css` | Hoja de Estilos | Estilos de alto contraste para tarjetas PC (Docente, Reservada, Mantenimiento, Ocupada, Disponible). |
| `src/app/pages/infraestructura/inventario-perifericos/inventario-perifericos.component.ts` | Vista UI (CU12) | Controlador de inventario con mini-mapa reactivo para reubicación de componentes. |
| `src/app/pages/infraestructura/inventario-perifericos/inventario-perifericos.component.html` | Plantilla HTML | Tabla de periféricos, badges de 4 niveles de estado y modal con mini-mapa al 50%. |
| `src/app/pages/infraestructura/inventario-perifericos/inventario-perifericos.component.css` | Hoja de Estilos | Estilos de alto contraste para badges de ubicación y contenedor del mini-mapa. |
| `src/styles.css` | Estilos Globales | Badges de alto contraste (`.citef-badge-success`, `.citef-badge-danger`, `.citef-badge-warning`, `.citef-badge-purple`, `.citef-badge-neutral`). |

---

## 7. Catálogo de Endpoints RESTful y Matriz RBAC

| Método | Endpoint | Permisos Requeridos | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/salas` | `INFRA_SALAS_GESTIONAR`, `INFRA_INVENTARIO_GESTIONAR` | Listado paginado y filtrado de salas activas. |
| `POST` | `/api/v1/salas` | `INFRA_SALAS_GESTIONAR` | Registro de nueva sala con dimensiones de cuadrícula. |
| `PUT` | `/api/v1/salas/:id` | `INFRA_SALAS_GESTIONAR` | Actualización de datos físicos y amenidades de sala. |
| `DELETE` | `/api/v1/salas/:id` | `INFRA_SALAS_GESTIONAR` | Baja lógica de sala (transiciona estado a `CERRADA`). |
| `GET` | `/api/v1/computadoras/sala/:idSala` | `INFRA_SALAS_GESTIONAR`, `INFRA_INVENTARIO_GESTIONAR` | Obtención de puestos de cómputo para la cuadrícula y mini-mapa. |
| `POST` | `/api/v1/computadoras` | `INFRA_SALAS_GESTIONAR` | Alta de nuevo puesto de cómputo en coordenadas ($F, C$). |
| `PUT` | `/api/v1/computadoras/:id` | `INFRA_SALAS_GESTIONAR` | Edición de código, IP y estado operativo de computadora. |
| `PUT` | `/api/v1/computadoras/distribucion/actualizar` | `INFRA_SALAS_GESTIONAR` | Actualización en dos fases de coordenadas de cuadrícula. |
| `DELETE` | `/api/v1/computadoras/:id` | `INFRA_SALAS_GESTIONAR` | Desincorporación física de estación de cómputo. |
| `GET` | `/api/v1/perifericos` | `INFRA_INVENTARIO_GESTIONAR` | Listado paginado de periféricos con filtros de componente y estado. |
| `POST` | `/api/v1/perifericos` | `INFRA_INVENTARIO_GESTIONAR` | Registro de periférico patrimonial en bodega o PC. |
| `PUT` | `/api/v1/perifericos/:id` | `INFRA_INVENTARIO_GESTIONAR` | Modificación de datos y reubicación asistida con mini-mapa. |
| `DELETE` | `/api/v1/perifericos/:id` | `INFRA_INVENTARIO_GESTIONAR` | Baja de hardware patrimonial. |

---

## 8. Guía Exhaustiva Paso a Paso para la Verificación

### Paso 1: Iniciar Sesión con Perfil Administrador
1. Ingrese al navegador en `http://localhost:4200/login`.
2. Credenciales:
   - **Correo:** `admin@uagrm.edu.bo`
   - **Contraseña:** `Admin123*`
3. En el Sidebar, observe la sección **INFRAESTRUCTURA Y EQUIPAMIENTO**:
   - `<i class="bi bi-display"></i>` **Salas y Laboratorios** (`/admin/infraestructura/salas`)
   - `<i class="bi bi-cpu"></i>` **Inventario de Periféricos** (`/admin/infraestructura/perifericos`)

---

### Paso 2: Probar Gestión de Laboratorios y Salas (CU9)
1. Ingrese a **Salas y Laboratorios**.
2. **Barra de Filtros:** Pruebe escribir en el buscador y presione "Buscar" y "Limpiar". Verifique que están en la misma fila y con el estilo carmesí sutil.
3. **Badges de Estado Operativo de Alto Contraste:**
   - Observe las salas registradas:
     * `OPERATIVA`: Verde bosque nítido con `<i class="bi bi-check-circle-fill"></i> Operativa`.
     * `EN_MANTENIMIENTO`: Ámbar/Naranja profundo con `<i class="bi bi-wrench-adjustable"></i> Mantenimiento`.
     * `CERRADA`: Carmesí institucional con `<i class="bi bi-slash-circle-fill"></i> Cerrada`.
4. **Baja Lógica y Cambio a Cerrada:**
   - En una sala de prueba, presione el botón de eliminar (basurero): confirme en el diálogo modal.
   - Compruebe que la sala cambia su estado a **Cerrada** y se deshabilita la fila (`row-disabled`), evitando su uso en el editor de cuadrícula.

---

### Paso 3: Probar Editor de Cuadrícula 2D (CU10 y CU11)
1. En la tabla de salas, haga clic en el botón de cuadrícula (`<i class="bi bi-grid-3x3"></i>`) de la sala `LAB-01`.
2. **Barra Superior Compacta:**
   - Compruebe que el selector de laboratorio solo muestra el código patrimonial (ej. `LAB-01`) para optimizar el espacio horizontal.
   - Verifique que los botones **"Nueva PC"** y **"Guardar Distribución"** están ubicados en la misma fila a la derecha.
3. **Leyenda de 5 Estados de Alto Contraste:**
   - Observe la barra de leyenda:
     * `Disponible` (Punto verde)
     * `Ocupada en Turno` (Punto azul marino)
     * `Reservada` (Punto púrpura índigo)
     * `<i class="bi bi-wrench-adjustable"></i> En Mantenimiento` (Punto naranja con llave inglesa)
     * `<i class="bi bi-person-workspace"></i> Estación Docente` (Punto carmesí institucional)
4. **Atajo de Clic en Celda Vacía para Nueva PC:**
   - Haga clic sobre cualquier celda vacía con símbolo `(+)` (ej. fila 2, columna 3):
   - Verifique que se abre inmediatamente el modal de "Nueva Estación de Cómputo" con **Fila: 2** y **Columna: 3** ya precargadas en los inputs.
   - Ingrese el código `L1-PC99`, seleccione estado `DISPONIBLE` y guarde.
   - Compruebe que el equipo aparece de inmediato en la celda indicada.
5. **Reubicación Drag & Drop y Algoritmo Two-Phase:**
   - Arrastre una computadora desde su celda actual hacia otra celda vacía:
   - Observe cómo la celda destino se resalta en verde esmeralda durante el arrastre (`cell-drop-target`).
   - Al soltar, el equipo se reubica visualmente y aparece el badge ámbar de *"Cambios sin guardar"*.
   - Presione **"Guardar Distribución"**: el backend ejecutará la transacción Two-Phase en PostgreSQL sin errores de clave única, confirmando con el banner de éxito institucional.
6. **Reubicación Asistida por Clic:**
   - Haga clic sobre una computadora: observe que entra en modo de selección resaltada (`workstation-selected`).
   - Las celdas vacías muestran la indicación *"Mover aquí"*. Haga clic en una celda vacía y la computadora se moverá de inmediato.

---

### Paso 4: Probar Inventario y Mini-Mapa Interactivo (CU12)
1. Ingrese a **Inventario de Periféricos** (`/admin/infraestructura/perifericos`).
2. **Badges de Condición Física de Alto Contraste:**
   - Compruebe la visualización de los 4 estados:
     * `<i class="bi bi-check-circle-fill"></i> Bueno` (Verde sólido)
     * `<i class="bi bi-shield-exclamation"></i> Regular (Prevención)` (Ámbar de prevención)
     * `<i class="bi bi-x-circle-fill"></i> Dañado` (Carmesí institucional)
     * `<i class="bi bi-question-circle-fill"></i> Faltante` (Gris de contraste)
3. **Badges de Ubicación Dual:**
   - `En Bodega`: Insignia gris pizarra con `<i class="bi bi-archive-fill"></i>`.
   - `Asignado a PC`: Insignia azul marina con `<i class="bi bi-display"></i>`.
4. **Reubicación Asistida con Mini-Mapa:**
   - Haga clic en el botón de edición (lápiz) de un periférico en bodega.
   - En el campo "Ubicación Física", cambie a **"Asignado a Estación PC"**.
   - En el selector de "Laboratorio de Destino", seleccione `LAB-01`:
   - **Verifique el Mini-Mapa:** Se desplegará inmediatamente un mapa interactivo a media escala (50%) que refleja la cuadrícula física del laboratorio.
   - Haga clic sobre una de las computadoras del mini-mapa: observe cómo el selector de "Computadora Asignada" se sincroniza automáticamente con la máquina seleccionada.
   - Guarde los cambios y compruebe que el periférico queda asignado a la computadora elegida.

---

### Paso 5: Probar Acceso con Rol Auxiliar (RBAC sin Error 403)
1. Cierre sesión o abra una ventana de incógnito.
2. Inicie sesión con un usuario auxiliar (ej. `auxiliar@uagrm.edu.bo` / contraseña asignada).
3. Ingrese a **Inventario de Periféricos**.
4. Abra el modal para registrar o editar un periférico y seleccione un laboratorio para ver el mini-mapa:
   - Compruebe que el mini-mapa carga correctamente las salas y las computadoras sin recibir error `403 Forbidden`.
   - Complete la reubicación demostrando la correcta calibración de permisos RBAC.

---

## 9. Certificación de Calidad y Cumplimiento

- **Compilación Backend (`npm run build` en `citef_backend`):** Código de salida `0`, 0 errores.
- **Compilación Frontend (`npm run build` en `citef_frontend`):** Código de salida `0`, 0 errores.
- **Pruebas Unitarias Backend (`npm test` en `citef_backend`):** **11 suites pasadas, 44 pruebas exitosas (100% PASS)**.
- **Auditoría de Emojis:** 0 emojis en todo el código base; uso exclusivo de Bootstrap Icons vectoriales.
- **Paginación Uniforme:** Estándar institucional de 15 filas por página con `<app-pagination>` posicionado a la derecha.
- **Arquitectura de 3 Archivos:** 100% de los componentes del Módulo 3 separados en archivos `.ts`, `.html` y `.css`.
- **Integridad de Puertos:** Puertos 3000, 4200 y 8001 respetados sin procesos huérfanos.
