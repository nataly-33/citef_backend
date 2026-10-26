# GUÍA MAESTRA Y PLAN DE IMPLEMENTACIÓN TÉCNICA - SISTEMA CITEF

**Proyecto:** Sistema Web de Gestión y Monitoreo Inteligente para Laboratorios de Computación del CITEF  
**Institución:** Facultad de Ciencias Económicas y Empresariales (FCEE) – Universidad Autónoma Gabriel René Moreno (UAGRM)  
**Modalidad:** Taller de Grado I / Modalidad de Titulación  
**Metodología:** PUDS / RUP (Proceso Unificado de Desarrollo de Software) y UML 2.5  
**Arquitectura Global:** Clean Architecture, Backend Modular RESTful (NestJS + TypeORM), Frontend SPA Reactivo (Angular 18 Standalone), Base de Datos Relacional PostgreSQL y Microservicio Analítico Predictivo Desacoplado (FastAPI + Python ML)

---

## ÍNDICE GENERAL DE LA GUÍA

1. [Directrices Inviolables de Diseño, Frontend y Experiencia de Usuario (UI/UX)](#1-directrices-inviolables-de-diseño-frontend-y-experiencia-de-usuario-uiux)
2. [Directrices Inviolables de Backend, Seguridad y Persistencia](#2-directrices-inviolables-de-backend-seguridad-y-persistencia)
3. [Catálogo y Contratos de Componentes Compartidos del Frontend](#3-catálogo-y-contratos-de-componentes-compartidos-del-frontend)
4. [Especificación Técnica Exhaustiva Módulo por Módulo](#4-especificación-técnica-exhaustiva-módulo-por-módulo)
   - [Módulo 1: Administración, Seguridad y Auditoría (CU1 – CU4)](#módulo-1-administración-seguridad-y-auditoría-cu1--cu4)
   - [Módulo 2: Catálogos y Parámetros Operativos (CU5 – CU8)](#módulo-2-catálogos-y-parámetros-operativos-cu5--cu8)
   - [Módulo 3: Infraestructura y Recursos Físicos (CU9 – CU11)](#módulo-3-infraestructura-y-recursos-físicos-cu9--cu11)
   - [Módulo 4: Ocupación y Monitoreo en Tiempo Real (CU12 – CU15)](#módulo-4-ocupación-y-monitoreo-en-tiempo-real-cu12--cu15)
   - [Módulo 5: Reservas Académicas y Disponibilidad (CU16 – CU20)](#módulo-5-reservas-académicas-y-disponibilidad-cu16--cu20)
   - [Módulo 6: Turnos de Guardia e Incidencias (CU21 – CU23)](#módulo-6-turnos-de-guardia-e-incidencias-cu21--cu23)
   - [Módulo 7: Soporte Técnico y Mantenimiento RAMS (CU24 – CU25)](#módulo-7-soporte-técnico-y-mantenimiento-rams-cu24--cu25)
   - [Módulo 8: Analítica Predictiva, Dashboard Ejecutivo y Reportes (CU26 – CU27)](#módulo-8-analítica-predictiva-dashboard-ejecutivo-y-reportes-máxima-prioridad-para-defensa-ii)
5. [Matriz de Comandos de Inicialización, Migración, Seeders y Pruebas](#5-matriz-de-comandos-de-inicialización-migración-seeders-y-pruebas)
6. [Instrucciones Estrictas para Agentes Autónomos de Desarrollo](#6-instrucciones-estrictas-para-agentes-autónomos-de-desarrollo)
7. [Resumen de Actualizaciones y Control de Versiones del Documento](#7-resumen-de-actualizaciones-y-control-de-versiones-del-documento)

---

## 1. Directrices Inviolables de Diseño, Frontend y Experiencia de Usuario (UI/UX)

Cualquier agente autónomo o desarrollador que genere código en el frontend (`citef_frontend`) debe obedecer rigurosamente las siguientes directrices. Cualquier incumplimiento de estas reglas se considerará código inválido:

### 1.1. Prohibición Absoluta de Emojis
* **Regla Estricta:** No se permite **ningún** emoji en ninguna parte de la aplicación (prohibido en botones, títulos, tarjetas, tablas, badges, textos de ayuda o mensajes de alerta).
* **Librería de Iconos Oficial:** Se utiliza de forma exclusiva **Bootstrap Icons** (`bi bi-*`).
  * Ejemplos correctos: `<i class="bi bi-pencil"></i>`, `<i class="bi bi-trash3"></i>`, `<i class="bi bi-shield-check"></i>`.

### 1.2. Paleta Institucional FCEE - UAGRM
El diseño visual debe transmitir la máxima formalidad académica e institucional. El color Rojo Carmesí debe tener presencia protagónica y equilibrada con el Azul Marino Institucional:
* **Rojo Carmesí UAGRM (Acento Primario / Alerta / Énfasis):** `#A81124` (Hover: `#8A0E1D`, Fondo tenue: `#FDF2F2`, Borde: `#FECACA`). Se utiliza para botones de confirmación crítica, badges de peligro/inactividad, detalles de cabecera y acciones de impacto.
* **Azul Marino Institucional (Estructura / Topbar / Autoridad):** `#002855` (Hover: `#073B75`, Fondo oscuro: `#001C3D`, Fondo suave: `#E0EDFF`). Se utiliza para la barra de navegación superior (topbar), encabezados de página, enlaces activos y badges informativos.
* **Neutros y Superficies:**
  * Fondo general de pantalla: `#F8FAFC` (Slate 50).
  * Tarjetas y modales: `#FFFFFF` (Blanco puro con sombra sutil `0 1px 3px rgba(0,0,0,0.08)`).
  * Bordes separadores: `#E2E8F0` (Gris Slate 200).
  * Texto principal: `#1E293B` (Gris oscuro 800).
  * Texto secundario y muted: `#64748B` (Gris 500).
* **Consumo Obligatorio:** Todos los estilos deben consumir los tokens centralizados en `citef_frontend/src/styles/theme-variables.css`. Prohibido quemar colores hexadecimales sueltos en estilos individuales.

### 1.3. Estructura de Tablas y Acciones por Fila
Cada tabla administrable en el sistema debe cumplir con:
1. **Acciones Estándar Obligatorias en cada fila:**
   * **Editar:** Botón con ícono de lápiz (`bi bi-pencil`). Abre el modal de edición precargado con los datos del registro.
   * **Eliminar / Desactivar:** Botón con ícono de basurero (`bi bi-trash3`) con estilo de peligro sutil (borde `#FECACA`, texto `#EF4444`, hover `#FEE2E2`). **Nunca debe ejecutar la baja directamente.** Siempre debe abrir el modal de confirmación (`ConfirmModalComponent`).
   * **Ver / Detalle (Opcional según entidad):** Botón con ícono de ojo (`bi bi-eye`) para consultar ficha forense o histórico.
2. **Barra de Búsqueda y Filtros:**
   * Campo de texto con ícono de lupa (`bi bi-search`).
   * **Botón explícito "Buscar":** Aplica los filtros de texto y selectores.
   * **Botón explícito "Limpiar":** Restablece todos los campos a su estado inicial ("Todos") y recarga la lista completa.
3. **Paginación Interactiva de 15 Registros por Página:**
   * Las tablas administrables deben desplegar un estándar estricto de **15 registros por página** para optimizar la visualización de datos y mantener interfaces compactas.
   * **Ubicación Obligatoria:** Los controles de paginación deben ubicarse alineados a la **derecha en la esquina inferior** (`justify-content: space-between` con controles en `margin-left: auto`), acompañados a la izquierda de la leyenda informativa: *"Mostrando X–Y de Z registros"*.
   * Controles obligatorios: Botón "Anterior", indicador numérico de páginas visibles con el número activo resaltado, y botón "Siguiente" para avanzar y retroceder fluidamente.
   * El paginador no debe bloquearse ni desaparecer cuando se elimina un registro o cuando una búsqueda arroja pocos resultados.
   * **Componente Compartido Obligatorio:** Debe utilizarse exclusivamente `<app-pagination>` proveniente de `citef_frontend/src/app/shared/components/pagination/`. Prohibido crear paginaciones ad-hoc o duplicar HTML/CSS en módulos individuales.
4. **Diseño Responsivo con Contenedor de Desbordamiento:**
   * Toda tabla debe estar encerrada en un `<div class="table-responsive">` con `overflow-x: auto` para que en laptops pequeñas y tablets nunca desborde el layout ni oculte botones.

### 1.4. Modales, Formularios y Validación Visual en Letras Rojas
* **Validación Visual Obligatoria en Letras Rojas:**
  * **Prohibido botones mudos o deshabilitados sin explicación:** Los botones de envío/guardado deben permanecer activos para que al hacer clic se evalúen las reglas y se notifique al usuario. Solo se deshabilitan cuando la petición está en curso (`guardando() === true`).
  * Si un campo requerido está vacío o no cumple con las restricciones mínimas (ej: nombres/apellidos vacíos, contraseña menor a 6 caracteres, correo con formato inválido o roles no seleccionados), deben desplegarse **mensajes descriptivos en letras rojas institucionales** (`#DC2626` / `#EF4444`) directamente debajo del campo correspondiente (`.field-error-text`).
  * Los campos con fallos deben adoptar borde de entrada rojo (`.input-error` con `border-color: #EF4444; background-color: #FEF2F2`).
  * **Manejo de Errores del Backend dentro del Modal:** Si el servidor rechaza la solicitud (ej. correo duplicado o error 400), el mensaje de error debe mostrarse en un banner rojo interno dentro del modal (`.modal-alert-danger`) sin cerrarlo, permitiendo que el usuario corrija los datos de inmediato.
* **Prohibido el uso de tarjetas con textos excesivos:** En formularios de asignación o selectores (como roles, carreras o motivos), usar `<select>` formal o chips compactos con checkboxes integrados. No crear cuadrículas de tarjetas gigantes con párrafos largos que desborden la pantalla verticalmente.
* **Botones de Modal:**
  * Cancelar: Botón con borde gris (`citef-btn-outline`).
  * Guardar / Confirmar: Botón principal (`citef-btn-primary` o `citef-btn-danger` si es eliminación).
  * Estado de carga: Cuando `guardando() === true`, deshabilitar inputs y botones, y mostrar texto *"Guardando..."*.

### 1.5. Limpieza Absoluta de Textos en la Navegación y Sidebar Reactivo (RBAC)
* **Sidebar Reactivo según Permisos RBAC:**
  * El menú lateral se actualiza dinámicamente de acuerdo a los permisos efectivos del usuario autenticado (`SEG_USUARIOS_VER`, `SEG_USUARIOS_CREAR`, `SEG_ROLES_GESTIONAR`, `SEG_AUDITORIA_VER`, etc.).
  * Si un administrador le otorga a un rol (por ejemplo, al rol Auxiliar) el permiso de crear usuarios o ver la bitácora, el sidebar debe reflejar de inmediato estas opciones y los endpoints del backend deben autorizar el acceso mediante el guardia granular de permisos.
* **Sidebar sin Jerga Técnica:**
  * **Prohibido** escribir códigos de casos de uso en los enlaces del menú (prohibido escribir "CU1", "CU2", etc.).
  * **Prohibido** incluir separadores de "Módulo 1", "Módulo 2". Al usuario y al personal administrativo no le interesan los números de caso ni de paquete.
  * Los textos de menú deben ser directos y sencillos:
    * `Usuarios`
    * `Roles y Permisos`
    * `Bitácora de Auditoría`
    * `Catálogos Académicos`
    * `Horarios y Turnos`
    * `Laboratorios y Salas`
    * `Monitoreo en Tiempo Real`
    * `Reservas de Salas`
    * `Turnos e Incidencias`
    * `Soporte Técnico`
    * `Reportes y Demanda`
* **Eliminación de Textos Redundantes:**
  * Eliminar leyendas de pie de página como *"Servidor API Conectado v1.0.0"*.
  * En la cabecera (topbar) y en el user-pill: mostrar una sola vez el nombre del usuario y una sola vez su insignia de rol (evitar repeticiones como *"Admin / Administrador / Admin Central"*).

---

## 2. Directrices Inviolables de Backend, Seguridad y Persistencia

### 2.1. Validación de Correos Electrónicos
* El sistema acepta correos de cualquier dominio válido (`@gmail.com`, `@hotmail.com`, `@uagrm.edu.bo`, `@correo.com.bo`).
* No restringir a `@uagrm.edu.bo` en el DTO ni en el frontend. Usar el validador estándar RFC `@IsEmail()` de `class-validator`.

### 2.2. Flujo Criptográfico Externo de Recuperación de Contraseña (CU2)
* **Prohibido mostrar tokens en pantalla:** La interfaz gráfica bajo ninguna circunstancia debe imprimir el token de recuperación generado.
* **Prohibido que el Administrador defina contraseñas ajenas:** Se elimina la función donde el administrador fija manualmente una clave nueva a un usuario. La seguridad y privacidad exigen que cada usuario gestione su clave mediante autoservicio.
* **Mecanismo Real vía Correo Electrónico (Brevo REST API HTTPS):**
  1. El servicio de correo transaccional opera exclusivamente mediante la **API REST HTTPS de Brevo** (`POST https://api.brevo.com/v3/smtp/email`) con clave `BREVO_API_KEY`, sin dependencias obsoletas de Nodemailer ni servidores SMTP bloqueables. Permite enviar hasta 300 correos diarios a **cualquier dirección de correo electrónico** sin requerir dominio DNS personalizado.
  2. El usuario solicita la recuperación ingresando su correo en `/recuperar-password`.
  3. Si el correo existe en la base de datos, el backend genera un token criptográfico SHA-256 de 64 caracteres con expiración estricta de **15 minutos**.
  4. El backend envía un correo HTML formal al buzón del usuario con el enlace directo:  
     `http://localhost:4200/recuperar-password?token=<TOKEN_HASH>`
  5. El endpoint HTTP responde un mensaje genérico de confirmación (`"Si el correo está registrado, recibirá un enlace en su bandeja"`), sin filtrar el token en la respuesta JSON.
  6. El usuario abre el enlace recibido en su correo. El frontend lee `?token=` desde los parámetros de la URL (`ActivatedRoute.queryParams`).
  7. Si el parámetro `token` está presente en la URL, la pantalla muestra los campos *"Nueva Contraseña"* y *"Confirmar Contraseña"*, y envía `POST /api/v1/auth/reset-password` con `{ token, nueva_password }`.
  8. El backend valida que el token no haya expirado y que `utilizado = false`. Al actualizar la clave, marca `utilizado = true` y registra el evento en auditoría.

### 2.3. Ejecución Exclusivamente Manual del Seeder
* **Prohibido Seeder Automático:** La aplicación NestJS **no** debe ejecutar seeders de base de datos de manera automática en el `onModuleInit` ni al arrancar.
* **Ejecución Manual por Comando:** Los seeders se ejecutan de manera aislada y controlada únicamente cuando el usuario lo solicite mediante:
  ```bash
  npm run seed
  ```
  El script standalone precarga roles, 27 permisos y los usuarios iniciales con sus passwords hasheadas con Bcrypt (cost 10).

### 2.4. Auditoría Forense Automática (CU4)
* Cada acción transaccional (`INSERT`, `UPDATE`, `DELETE`, `CAMBIO_ESTADO`, `LOGIN`, `RESET_PASSWORD`) debe invocar `auditoriaService.registrar(...)`.
* Se almacena en la tabla `bitacora_auditoria` con columnas tipo `jsonb`:
  * `valores_anteriores`: estado previo del registro en formato JSON.
  * `valores_nuevos`: nuevo estado del registro en formato JSON.
  * `id_usuario`, `correo_usuario`, `ip_cliente`, `tabla_afectada`, `id_registro_afectado`, `fecha_hora`.

### 2.5. Política de Cierre de Puertos en Terminal
* **Nunca dejar servidores corriendo en segundo plano de manera desatendida:** El usuario levantará los servidores (`npm start`, `npm run start:dev`) desde sus terminales dedicadas. Al concluir tareas de agente, asegurarse de que no queden procesos huérfanos ocupando los puertos `3000` ni `4200`.

---

## 3. Catálogo y Contratos de Componentes Compartidos del Frontend

Para que todos los módulos mantengan uniformidad visual y funcional, deben consumir los siguientes componentes reutilizables ubicados en `citef_frontend/src/app/shared/components/`:

```
citef_frontend/src/app/shared/components/
├── index.ts                             # Exportación centralizada (barrel export)
├── confirm-modal/
│   └── confirm-modal.component.ts       # Modal de confirmación para bajas y acciones críticas
├── pagination/
│   └── pagination.component.ts          # Paginador estandarizado a 15 filas con controles a la derecha
├── modal-alert/
│   └── modal-alert.component.ts         # Banner de alerta roja/amarilla/verde dentro de modales
└── table-card/
    └── table-card.component.ts          # Contenedor de tarjeta unificado con cabecera y pie
```

### 3.1. Contrato del `PaginationComponent` (`<app-pagination>`):
* **Ruta:** `citef_frontend/src/app/shared/components/pagination/pagination.component.ts`
* **Entradas (`@Input`):**
  * `paginaActual: number`: Número de la página activa (inicia en 1).
  * `totalRegistros: number`: Cantidad total de registros devueltos o filtrados.
  * `tamanoPagina: number = 15`: Límite estricto de registros por página (15 registros).
  * `etiqueta: string = 'registros'`: Nombre de la entidad (ej: `'usuarios'`, `'registros'`, `'permisos'`).
* **Salidas (`@Output`):**
  * `paginaCambiada: EventEmitter<number>`: Emite el nuevo índice de página seleccionado.
* **Diseño Visual:** Alineación en la esquina inferior derecha con leyenda informativa a la izquierda y botones numéricos activos.

### 3.2. Contrato del `ModalAlertComponent` (`<app-modal-alert>`):
* **Ruta:** `citef_frontend/src/app/shared/components/modal-alert/modal-alert.component.ts`
* **Entradas (`@Input`):**
  * `mensaje: string | null`: Texto de error, advertencia o éxito a desplegar.
  * `tipo: 'danger' | 'warning' | 'info' | 'success' = 'danger'`: Variante visual. En `'danger'` utiliza fondo `#FEF2F2`, texto `#DC2626` y borde `#FECACA`.
  * `dismissible: boolean = true`: Permite al usuario cerrar la alerta.
* **Salidas (`@Output`):**
  * `cerrar: EventEmitter<void>`: Disparado al pulsar el botón de cerrar.

### 3.3. Contrato del `TableCardComponent` (`<app-table-card>`):
* **Ruta:** `citef_frontend/src/app/shared/components/table-card/table-card.component.ts`
* **Entradas (`@Input`):**
  * `title?: string`: Título opcional de la sección.
  * `subtitle?: string`: Subtítulo o descripción breve.
* **Slots de Proyección:**
  * Cuerpo default: Contenedor responsivo para el elemento `<table>`.
  * `[card-actions]`: Botones y filtros superiores.
  * `[card-footer]`: Ranura inferior para `<app-pagination>`.

### 3.4. Contrato del `ConfirmModalComponent` (`<app-confirm-modal>`):
* **Ruta:** `citef_frontend/src/app/shared/components/confirm-modal/confirm-modal.component.ts`
* **Entradas (`@Input`):**
  * `visible: boolean`: Controla la apertura del backdrop y modal.
  * `title: string`: Título formal (ej: *"Confirmar Baja de Usuario"*).
  * `message: string`: Texto descriptivo que indica las consecuencias de la acción.
  * `confirmBtnText: string`: Texto del botón principal (ej: *"Desactivar"*, *"Eliminar"*, *"Cancelar Reserva"*).
  * `cancelBtnText: string`: Texto del botón secundario (por defecto *"Cancelar"*).
  * `isDanger: boolean`: Si es `true`, aplica el botón en Rojo Carmesí institucional (`#A81124`).
* **Salidas (`@Output`):**
  * `confirmed: EventEmitter<void>`: Disparado al confirmar.
  * `cancelled: EventEmitter<void>`: Disparado al pulsar cancelar o la 'X'.

---

## 4. Especificación Técnica Exhaustiva Módulo por Módulo

---

### MÓDULO 1: ADMINISTRACIÓN, SEGURIDAD Y AUDITORÍA

#### 1. Casos de Uso Cubiertos
* **CU1: Gestionar usuarios** (CRUD, alta con roles, edición completa, baja con confirmación).
* **CU2: Restablecer credenciales de acceso** (Flujo externo por correo con enlace tokenizado de 15 minutos).
* **CU3: Gestionar roles y permisos** (Tabla de roles, asignación matricial de los 27 permisos del sistema).
* **CU4: Consultar bitácora de auditoría** (Inspección cronológica con visor modal forense JSON).

#### 2. Inventario de Archivos del Módulo 1
```
citef_backend/src/modules/
├── auth/
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── mail.service.ts
│   ├── dto/
│   │   ├── login.dto.ts
│   │   ├── solicitar-recuperacion.dto.ts
│   │   └── reset-password.dto.ts
│   └── guards/
│       ├── jwt-auth.guard.ts
│       └── roles.guard.ts
├── usuarios/
│   ├── entities/
│   │   ├── usuario.entity.ts
│   │   ├── rol.entity.ts
│   │   ├── permiso.entity.ts
│   │   └── token-recuperacion.entity.ts
│   ├── dto/
│   │   ├── crear-usuario.dto.ts
│   │   ├── actualizar-usuario.dto.ts
│   │   └── crear-rol.dto.ts
│   ├── usuarios.controller.ts
│   ├── usuarios.service.ts
│   ├── roles.controller.ts
│   └── roles.service.ts
├── auditoria/
│   ├── entities/
│   │   └── bitacora-auditoria.entity.ts
│   ├── auditoria.controller.ts
│   └── auditoria.service.ts
└── scripts/
    └── seed.ts

citef_frontend/src/app/
├── core/
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── usuarios.service.ts
│   │   └── auditoria.service.ts
│   └── guards/
│       └── auth.guard.ts
├── layout/
│   └── shell/
│       └── shell.component.ts
└── pages/
    ├── login/
    │   └── login.component.ts
    ├── recuperar-password/
    │   └── recuperar-password.component.ts
    ├── usuarios/
    │   └── usuarios.component.ts
    ├── roles/
    │   └── roles.component.ts
    └── auditoria/
        └── auditoria.component.ts
```

#### 3. Esquema de Base de Datos y Entidades
* **Tabla `usuario`:**
  * `id_usuario`: SERIAL PRIMARY KEY.
  * `correo_institucional`: VARCHAR(150) UNIQUE NOT NULL.
  * `password_hash`: VARCHAR(255) NOT NULL.
  * `nombres`: VARCHAR(100) NOT NULL.
  * `apellidos`: VARCHAR(100) NOT NULL.
  * `telefono`: VARCHAR(20) NULL.
  * `activo`: BOOLEAN NOT NULL DEFAULT TRUE.
  * `creado_en`: TIMESTAMP DEFAULT NOW().
  * `actualizado_en`: TIMESTAMP DEFAULT NOW().
* **Tabla `rol`:**
  * `id_rol`: SERIAL PRIMARY KEY.
  * `nombre`: VARCHAR(50) UNIQUE NOT NULL (`ADMINISTRADOR`, `DOCENTE`, `AUXILIAR`, `TECNICO`).
  * `descrip`: VARCHAR(255) NOT NULL.
  * `activo`: BOOLEAN DEFAULT TRUE.
* **Tabla `permiso`:**
  * `id_permiso`: SERIAL PRIMARY KEY.
  * `codigo`: VARCHAR(100) UNIQUE NOT NULL (`CU1_GESTIONAR_USUARIOS`, `CU12_MONITOREAR_SALAS`, etc.).
  * `modulo`: VARCHAR(100) NOT NULL.
  * `descrip`: VARCHAR(255) NOT NULL.
* **Tabla Intermedia `usuario_rol`:** Relación Many-to-Many entre `usuario` y `rol`.
* **Tabla Intermedia `rol_permiso`:** Relación Many-to-Many entre `rol` y `permiso`.
* **Tabla `token_recuperacion`:**
  * `id_token`: SERIAL PRIMARY KEY.
  * `id_usuario`: INT REFERENCES `usuario(id_usuario)` ON DELETE CASCADE.
  * `token_hash`: VARCHAR(64) UNIQUE NOT NULL (SHA-256).
  * `expira_en`: TIMESTAMP NOT NULL (15 minutos exactos desde su creación).
  * `utilizado`: BOOLEAN NOT NULL DEFAULT FALSE.
* **Tabla `bitacora_auditoria`:**
  * `id_auditoria`: BIGSERIAL PRIMARY KEY.
  * `id_usuario`: INT NULL.
  * `correo_usuario`: VARCHAR(150) NULL.
  * `accion`: VARCHAR(50) NOT NULL (`LOGIN`, `INSERT`, `UPDATE`, `DELETE`, `CAMBIO_ESTADO`, `RESET_PASSWORD`).
  * `tabla_afectada`: VARCHAR(50) NOT NULL.
  * `id_registro_afectado`: VARCHAR(50) NULL.
  * `valores_anteriores`: JSONB NULL.
  * `valores_nuevos`: JSONB NULL.
  * `ip_cliente`: VARCHAR(45) NULL.
  * `fecha_hora`: TIMESTAMP DEFAULT NOW().

#### 4. Endpoints de API REST
| Método | Ruta | Rol Mínimo | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Público | Autentica credenciales, emite JWT (exp 8h) |
| `POST` | `/api/v1/auth/solicitar-recuperacion` | Público | Genera token de 15 min y envía email con enlace |
| `POST` | `/api/v1/auth/reset-password` | Público | Valida token de URL y actualiza password |
| `GET` | `/api/v1/usuarios` | `ADMINISTRADOR` | Lista usuarios con filtros (`activo`, `busqueda`) |
| `GET` | `/api/v1/usuarios/:id` | `ADMINISTRADOR` | Detalle del usuario con sus roles |
| `POST` | `/api/v1/usuarios` | `ADMINISTRADOR` | Registra usuario con roles y contraseña inicial |
| `PUT` | `/api/v1/usuarios/:id` | `ADMINISTRADOR` | Actualiza nombres, apellidos, teléfono, estado y roles |
| `DELETE` | `/api/v1/usuarios/:id` | `ADMINISTRADOR` | Desactiva usuario (`activo = false`) con auditoría |
| `GET` | `/api/v1/roles` | `ADMINISTRADOR` | Catálogo de roles con permisos asociados |
| `GET` | `/api/v1/roles/permisos` | `ADMINISTRADOR` | Lista completa de los 27 permisos por módulo |
| `POST` | `/api/v1/roles` | `ADMINISTRADOR` | Crea un nuevo rol |
| `PUT` | `/api/v1/roles/:id/permisos` | `ADMINISTRADOR` | Asigna matriz de IDs de permisos a un rol |
| `GET` | `/api/v1/auditoria` | `ADMINISTRADOR` | Consulta bitácora con filtros y paginación |

#### 5. Errores Comunes del Usuario y Validaciones Preventivas
* **Correo Duplicado:** Si se intenta crear un usuario con un correo existente, lanzar `ConflictException (409)` con mensaje claro: *"El correo electrónico ya se encuentra registrado"*.
* **Sin Roles Asignados:** Validar en frontend y backend que `roles_ids.length > 0`. No permitir usuarios sin al menos un rol asignado.
* **Token Expirado:** Si el usuario hace clic en el enlace del correo después de 15 minutos o si el token ya fue utilizado, devolver `BadRequestException (400)` con mensaje: *"El enlace de recuperación ha expirado o ya fue utilizado. Solicite uno nuevo"*.
* **Baja Accidental:** Prohibir la eliminación inmediata; siempre disparar `ConfirmModalComponent`.

---

### MÓDULO 2: CATÁLOGOS Y PARÁMETROS OPERATIVOS

#### 1. Casos de Uso Cubiertos
* **CU5: Gestionar catálogos académicos** (Carreras, Semestres y Materias con su carga horaria).
* **CU6: Gestionar catálogos operativos** (Motivos de uso autorizados: libre, práctico, examen; y Franjas Horarias).
* **CU7: Importar padrón docente** (Carga masiva por archivo Excel `.xlsx` o `.csv` con validación transaccional).
* **CU8: Asignar turnos a auxiliares** (Asignación semestral fija por 6 meses a auxiliares becarios).

#### 2. Inventario de Archivos del Módulo 2
```
citef_backend/src/modules/catalogos/
├── entities/
│   ├── carrera.entity.ts
│   ├── materia.entity.ts
│   ├── carrera-materia.entity.ts
│   ├── docente.entity.ts
│   ├── motivo-uso.entity.ts
│   ├── horario-operativo.entity.ts
│   └── asignar-turno.entity.ts
├── dto/
│   ├── crear-carrera.dto.ts
│   ├── crear-materia.dto.ts
│   ├── crear-motivo.dto.ts
│   ├── crear-horario.dto.ts
│   ├── crear-docente.dto.ts
│   ├── actualizar-docente.dto.ts
│   └── asignar-turno.dto.ts
├── services/
│   ├── carreras.service.ts
│   ├── materias.service.ts
│   ├── docentes.service.ts
│   ├── motivos.service.ts
│   ├── horarios.service.ts
│   └── turnos-auxiliares.service.ts
├── controllers/
│   ├── academicos.controller.ts
│   ├── operativos.controller.ts
│   ├── docentes.controller.ts
│   └── turnos-auxiliares.controller.ts
└── catalogos.module.ts

citef_frontend/src/app/pages/catalogos/
├── academicos/
│   └── academicos.component.ts          # Pestañas limpias para Carreras y Materias con soporte multi-carrera
├── operativos/
│   └── operativos.component.ts          # Gestión de Franjas Horarias y Motivos de Uso
├── importar-docentes/
│   └── importar-docentes.component.ts   # Carga drag & drop de Excel (.xlsx), visor preliminar, reporte de errores y aviso de clave inicial
└── turnos-auxiliares/
    └── turnos-auxiliares.component.ts   # Asignación semestral fija (auxiliar + franja horaria + semestre)
```

#### 3. Esquema de Base de Datos y Entidades
* **Tabla `carrera`:**
  * `id_carrera`: SERIAL PRIMARY KEY.
  * `codigo`: VARCHAR(20) UNIQUE NOT NULL (ej: `186-5`).
  * `nombre`: VARCHAR(100) NOT NULL (ej: `Ingeniería Comercial`).
  * `activo`: BOOLEAN DEFAULT TRUE.
* **Tabla `materia` (Catálogo Puro de Asignaturas):**
  * `id_materia`: SERIAL PRIMARY KEY.
  * `sigla`: VARCHAR(20) UNIQUE NOT NULL (ej: `MAT101`, `FIN200`).
  * `nombre`: VARCHAR(150) NOT NULL.
  * `activo`: BOOLEAN DEFAULT TRUE.
* **Tabla Asociativa `carrera_materia` (Malla Curricular N:M):**
  * `id_carrera_materia`: SERIAL PRIMARY KEY.
  * `id_carrera`: INT REFERENCES `carrera(id_carrera)` ON DELETE RESTRICT.
  * `id_materia`: INT REFERENCES `materia(id_materia)` ON DELETE RESTRICT.
  * `semestre_nivel`: INT NOT NULL (1 al 10).
  * `activo`: BOOLEAN DEFAULT TRUE.
  * CONSTRAINT: `UNIQUE (id_carrera, id_materia)`.
* **Tabla `docente` (Perfil Académico 1:1 con `usuario`):**
  * `codigo`: VARCHAR(30) PRIMARY KEY (Código de planilla docente UAGRM, llave natural).
  * `id_usuario`: BIGINT UNIQUE NOT NULL REFERENCES `usuario(id_usuario)` ON DELETE CASCADE.
  * `departamento_academico`: VARCHAR(100) DEFAULT 'General'.
  * `condicion_contrato`: VARCHAR(30) DEFAULT 'TITULAR'.
  * `activo`: BOOLEAN DEFAULT TRUE.
  * *(Nota: Al crear o importar docentes se genera automáticamente su cuenta en `usuario` con rol `DOCENTE` y contraseña inicial predeterminada `Docente.CITEF2026*`).*
* **Tabla `motivo_uso`:**
  * `id_motivo`: SERIAL PRIMARY KEY.
  * `descrip`: VARCHAR(100) NOT NULL (`Clase Práctica`, `Investigación Libre`, `Examen Parcial`, `Mantenimiento`).
  * `tipo`: VARCHAR(30) NOT NULL (`ACADEMICO`, `LIBRE`, `ADMINISTRATIVO`).
  * `activo`: BOOLEAN DEFAULT TRUE.
* **Tabla `horario_operativo`:**
  * `id_horario`: SERIAL PRIMARY KEY.
  * `turno`: VARCHAR(20) NOT NULL (`MAÑANA`, `TARDE`, `NOCHE`).
  * `hora_inicio`: TIME NOT NULL.
  * `hora_fin`: TIME NOT NULL.
  * `activo`: BOOLEAN DEFAULT TRUE.
* **Tabla `asignar_turno`:**
  * `id_asignacion_turno`: SERIAL PRIMARY KEY.
  * `id_usuario`: INT REFERENCES `usuario(id_usuario)` (debe pertenecer al rol `AUXILIAR`).
  * `id_horario`: INT REFERENCES `horario_operativo(id_horario)`.
  * `semestre`: VARCHAR(20) NOT NULL (ej: `1-2026`).
  * `fecha_inicio`: DATE NOT NULL.
  * `fecha_fin`: DATE NOT NULL.
  * `activo`: BOOLEAN DEFAULT TRUE.
  * *(Nota de Negocio: Se eliminó `dia_semana`; los turnos son semestrales fijos de 6 meses).*

#### 4. Endpoints de API REST
| Método | Ruta | Rol Mínimo | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` / `POST` | `/api/v1/catalogos/carreras` | `ADMINISTRADOR` | Listar y crear carreras |
| `PUT` / `DELETE`| `/api/v1/catalogos/carreras/:id` | `ADMINISTRADOR` | Editar y desactivar carrera con confirmación |
| `GET` / `POST` | `/api/v1/catalogos/materias` | `ADMINISTRADOR` | Listar y crear materias por carrera |
| `POST` | `/api/v1/docentes/importar-excel` | `ADMINISTRADOR` | Multipart/form-data: sube Excel y valida padrón |
| `GET` | `/api/v1/docentes` | `ADMINISTRADOR`, `AUXILIAR` | Listar docentes con paginación y búsqueda |
| `GET` / `POST` | `/api/v1/catalogos/motivos` | `ADMINISTRADOR` | Listar y crear motivos de uso |
| `GET` / `POST` | `/api/v1/catalogos/horarios` | `ADMINISTRADOR` | Listar y crear franjas horarias |
| `POST` | `/api/v1/turnos-auxiliares` | `ADMINISTRADOR` | Asigna turno semestral fijo a un auxiliar |
| `GET` | `/api/v1/turnos-auxiliares` | `ADMINISTRADOR` | Consulta de asignaciones semestrales |

#### 5. Errores Comunes del Usuario y Validaciones Preventivas
* **Formato de Archivo en Carga Masiva (CU7):** Si el usuario sube un archivo con extensión no permitida (ej: `.pdf`, `.png`), rechazar inmediatamente antes de procesar: *"Solo se admiten libros de Excel (.xlsx, .xls) o archivos .csv"*.
* **Filas Corruptas en Excel:** Validar encabezados obligatorios: `codigo`, `nombres`, `apellidos`, `correo`. Si hay códigos duplicados dentro del mismo archivo o en la base de datos, el backend procesa en transacción (`QueryRunner`); si una falla, revierte todo (`ROLLBACK`) e informa la fila exacta del error.
* **Superposición de Turnos a Auxiliares (CU8):** Un auxiliar no puede tener dos asignaciones de turno en el mismo semestre con franjas horarias que se solapen.

---

### MÓDULO 3: INFRAESTRUCTURA Y RECURSOS FÍSICOS

#### 1. Casos de Uso Cubiertos
* **CU9: Gestionar laboratorios** (Salas de cómputo del CITEF, pisos, capacidad de máquinas de alumnos y máquina docente).
* **CU10: Configurar salas de laboratorios** (Editor de cuadrícula X, Y para ubicar físicamente cada computadora).
* **CU11: Controlar inventario de periféricos** (Teclados, mouse y monitores vinculados a computadoras o en bodega).

#### 2. Inventario de Archivos del Módulo 3
```
citef_backend/src/modules/infraestructura/
├── entities/
│   ├── laboratorio-sala.entity.ts
│   ├── computadora.entity.ts
│   ├── tipo-periferico.entity.ts
│   └── periferico-inventario.entity.ts
├── dto/
│   ├── crear-sala.dto.ts
│   ├── actualizar-sala.dto.ts
│   ├── crear-computadora.dto.ts
│   ├── actualizar-computadora.dto.ts
│   ├── guardar-posiciones-computadoras.dto.ts
│   ├── registrar-periferico.dto.ts
│   ├── actualizar-periferico.dto.ts
│   └── asignar-periferico.dto.ts
├── services/
│   ├── salas.service.ts
│   ├── computadoras.service.ts
│   └── perifericos.service.ts
├── controllers/
│   ├── salas.controller.ts
│   ├── computadoras.controller.ts
│   └── perifericos.controller.ts
└── infraestructura.module.ts

citef_frontend/src/app/pages/infraestructura/
├── salas/
│   ├── salas.component.ts               # Lógica y control de salas con paginación
│   ├── salas.component.html             # Listado con capacidad, piso y botón editor X/Y
│   └── salas.component.css              # Estilos formales FCEE y validaciones en rojo
├── editor-cuadricula/
│   ├── editor-cuadricula.component.ts   # Control interactivo de coordenadas y prevención de colisión
│   ├── editor-cuadricula.component.html # Grid interactivo 2D con arrastre de puestos y guardado
│   └── editor-cuadricula.component.css  # Matriz visual, pódium frontal y tarjetas de puestos
└── inventario-perifericos/
    ├── inventario-perifericos.component.ts # Control de inventario de periféricos y asignación
    ├── inventario-perifericos.component.html # Tabla de periféricos por estación/bodega con filtros
    └── inventario-perifericos.component.css  # Estilos, insignias y modales institucionales
```

#### 3. Esquema de Base de Datos y Entidades
* **Tabla `laboratorio_sala`:**
  * `id_sala`: SERIAL PRIMARY KEY.
  * `nombre`: VARCHAR(50) UNIQUE NOT NULL (ej: `Laboratorio CITEF 1`).
  * `piso`: INT NOT NULL (ej: `1`, `2`). *(Nota: se eliminó `pabellon` por redundancia).*
  * `cant_computadoras`: INT NOT NULL DEFAULT 0.
  * `maquina_docente`: BOOLEAN NOT NULL DEFAULT TRUE. *(Nota: nombre directo sin prefijo 'tiene').*
  * `activo`: BOOLEAN DEFAULT TRUE.
* **Tabla `computadora`:**
  * `id_computadora`: SERIAL PRIMARY KEY.
  * `id_sala`: INT REFERENCES `laboratorio_sala(id_sala)` ON DELETE CASCADE (Relación de composición: si la sala física desaparece, sus puestos desaparecen).
  * `codigo_patrimonial`: VARCHAR(50) UNIQUE NOT NULL (ej: `UAGRM-PC-042`).
  * `pos_x`: INT NOT NULL (coordenada columna en cuadrícula, min 0).
  * `pos_y`: INT NOT NULL (coordenada fila en cuadrícula, min 0).
  * `maquina_docente`: BOOLEAN NOT NULL DEFAULT FALSE.
  * `horas_uso_acumuladas`: INT NOT NULL DEFAULT 0 (Minutos u horas acumuladas para el balanceo de hardware).
  * `estado`: VARCHAR(30) NOT NULL DEFAULT 'DISPONIBLE' (`DISPONIBLE`, `OCUPADO`, `EN_MANTENIMIENTO`, `AVERIA_REPORTADA`).
  * UNIQUE (`id_sala`, `pos_x`, `pos_y`) -> Evita colisiones de dos máquinas en la misma celda física.
* **Tabla `periferico`:**
  * `id_periferico`: SERIAL PRIMARY KEY.
  * `id_computadora`: INT NULL REFERENCES `computadora(id_computadora)` ON DELETE SET NULL (Relación de asociación: si una PC se descarta, el periférico vuelve a inventario en bodega).
  * `tipo`: VARCHAR(30) NOT NULL (`TECLADO`, `MOUSE`, `MONITOR`, `REGULADOR`).
  * `marca_modelo`: VARCHAR(100) NOT NULL.
  * `numero_activo`: VARCHAR(100) UNIQUE NOT NULL.
  * `estado`: VARCHAR(30) NOT NULL DEFAULT 'OPERATIVO' (`OPERATIVO`, `DEFECTUOSO`, `BAJA`).

#### 4. Endpoints de API REST
| Método | Ruta | Rol Mínimo | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` / `POST` | `/api/v1/salas` | `ADMINISTRADOR`, `AUXILIAR` | Listar y crear salas |
| `PUT` / `DELETE`| `/api/v1/salas/:id` | `ADMINISTRADOR` | Editar datos de sala / desactivar con confirmación |
| `GET` | `/api/v1/salas/:id/computadoras` | `ADMINISTRADOR`, `AUXILIAR` | Obtener máquinas y coordenadas X, Y de la sala |
| `PUT` | `/api/v1/salas/:id/posiciones` | `ADMINISTRADOR`, `AUXILIAR` | Guardar posiciones masivas `[{ id_computadora, pos_x, pos_y }]` |
| `POST` | `/api/v1/computadoras` | `ADMINISTRADOR` | Dar de alta nueva PC en una sala |
| `GET` / `POST` | `/api/v1/perifericos` | `ADMINISTRADOR`, `AUXILIAR` | Inventario de periféricos |
| `PATCH` | `/api/v1/perifericos/:id/asignar` | `ADMINISTRADOR`, `AUXILIAR` | Asignar periférico a una PC o mover a bodega |

#### 5. Errores Comunes del Usuario y Validaciones Preventivas
* **Colisión en Cuadrícula (CU10):** Si el auxiliar arrastra una máquina sobre una coordenada `(pos_x, pos_y)` que ya está ocupada por otra máquina, el frontend debe prevenir el solapamiento visualmente y el backend debe lanzar `BadRequestException (400)` por violación de la restricción única.
* **Periférico con Número de Activo Duplicado (CU11):** Validar que `numero_activo` sea único antes de guardar.
* **Capacidad Máxima Excedida:** No permitir registrar más computadoras que la `cant_computadoras` declarada para la sala.

---

### MÓDULO 4: OCUPACIÓN Y MONITOREO EN TIEMPO REAL

#### 1. Casos de Uso Cubiertos
* **CU12: Monitorear ocupación de salas** (Dashboard visual síncrono vía WebSockets / Socket.io).
* **CU13: Asignar equipo** (Búsqueda de alumno por registro, asignación manual o automática balanceando horas de uso, cálculo de cola $W_q$).
* **CU14: Liberar equipo** (Checkout del puesto, acumulación de tiempo de uso y actualización síncrona).
* **CU15: Consultar asistencias de estudiantes** (Histórico de uso con filtros y exportación).

#### 2. Inventario de Archivos del Módulo 4
```
citef_backend/src/modules/ocupacion/
├── entities/
│   ├── estudiante.entity.ts
│   ├── sesion-uso.entity.ts
│   └── cola-espera.entity.ts
├── dto/
│   ├── asignar-equipo.dto.ts
│   ├── liberar-equipo.dto.ts
│   └── consultar-asistencias.dto.ts
├── gateways/
│   └── ocupacion.gateway.ts             # Servidor WebSocket para emitir eventos de cambio de estado en vivo
├── services/
│   ├── ocupacion.service.ts             # Lógica de asignación, balanceo de uso de hardware y liberación
│   ├── colas-espera.service.ts          # Gestión de lista de espera cuando la sala supera el 90%
│   └── asistencias.service.ts           # Consultas históricas
├── controllers/
│   ├── ocupacion.controller.ts
│   └── asistencias.controller.ts
└── ocupacion.module.ts

citef_frontend/src/app/pages/ocupacion/
├── monitor-sala/
│   └── monitor-sala.component.ts        # Matriz visual en tiempo real con computadoras en verde/rojo/gris
├── modal-asignar-equipo/
│   └── modal-asignar-equipo.component.ts# Diálogo para ingresar registro del alumno y motivo
└── asistencias/
    └── asistencias.component.ts         # Tabla histórica de asistencias con filtros por fecha y carrera
```

#### 3. Esquema de Base de Datos y Entidades
* **Tabla `estudiante`:**
  * `registro`: VARCHAR(30) PRIMARY KEY (El registro universitario es la PK única, se elimina `id_estudiante` artificial).
  * `nombres`: VARCHAR(100) NOT NULL.
  * `apellidos`: VARCHAR(100) NOT NULL.
  * `id_carrera`: INT REFERENCES `carrera(id_carrera)`.
  * `correo`: VARCHAR(150) NULL.
  * `bloqueado`: BOOLEAN NOT NULL DEFAULT FALSE (por averías pendientes o sanciones).
* **Tabla `sesion_uso`:**
  * `id_sesion`: BIGSERIAL PRIMARY KEY.
  * `id_computadora`: INT REFERENCES `computadora(id_computadora)`.
  * `registro_estudiante`: VARCHAR(30) REFERENCES `estudiante(registro)`.
  * `id_motivo`: INT REFERENCES `motivo_uso(id_motivo)`.
  * `hora_inicio`: TIMESTAMP DEFAULT NOW().
  * `hora_fin`: TIMESTAMP NULL.
  * `minutos_uso`: INT NULL.
  * `id_usuario_auxiliar`: INT REFERENCES `usuario(id_usuario)`.
* **Tabla `cola_espera`:**
  * `id_cola`: SERIAL PRIMARY KEY.
  * `id_sala`: INT REFERENCES `laboratorio_sala(id_sala)`.
  * `registro_estudiante`: VARCHAR(30) REFERENCES `estudiante(registro)`.
  * `fecha_hora_ingreso`: TIMESTAMP DEFAULT NOW().
  * `atendido`: BOOLEAN DEFAULT FALSE.

#### 4. Endpoints y Eventos WebSocket
* **WebSocket Gateway (`/ws/ocupacion`):**
  * Evento entrante: `suscribir_sala { id_sala }`.
  * Evento saliente: `estado_sala_actualizado { id_sala, computadoras: [...] }`.
* **REST Endpoints:**
| Método | Ruta | Rol Mínimo | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/ocupacion/salas/:id` | `AUXILIAR`, `ADMINISTRADOR` | Estado actual de todas las máquinas de la sala |
| `POST` | `/api/v1/ocupacion/asignar` | `AUXILIAR` | Asigna máquina a un estudiante y emite WebSocket |
| `POST` | `/api/v1/ocupacion/liberar` | `AUXILIAR` | Libera máquina, calcula minutos y emite WebSocket |
| `GET` | `/api/v1/ocupacion/asistencias` | `AUXILIAR`, `ADMINISTRADOR` | Historial de asistencias con paginación y búsqueda |
| `GET` | `/api/v1/ocupacion/estudiantes/:reg`| `AUXILIAR` | Búsqueda rápida de alumno por su registro |

#### 5. Errores Comunes del Usuario y Validaciones Preventivas
* **Asignación a Estudiante Bloqueado:** Si el estudiante tiene sanciones o averías técnicas no resueltas (`bloqueado = true`), denegar la asignación: *"El estudiante presenta una sanción o investigación técnica pendiente"*.
* **Asignación Concurrente:** Si dos auxiliares intentan asignar la misma computadora al mismo tiempo, el backend aplica bloqueo optimista/pesimista: la segunda petición recibe `ConflictException (409)`: *"El equipo acaba de ser asignado por otro operador"*.
* **Estudiante con Doble Sesión Activa:** Un estudiante no puede tener dos computadoras asignadas simultáneamente en el CITEF.

---

### MÓDULO 5: RESERVAS ACADÉMICAS Y DISPONIBILIDAD

#### 1. Casos de Uso Cubiertos
* **CU16: Solicitar reserva de sala** (Docente selecciona sala, materia, fecha, horario, tipo `CLASE`/`EXAMEN`, soporte multi-sala y programación semestral recurrente).
* **CU17: Consultar reservas de sala** (Calendario interactivo semanal y vista de día dinámica particionada estilo Google Calendar).
* **CU18: Validar disponibilidad de horarios** (Algoritmo estricto de no-solapamiento horario, aforo multi-sala y prioridad académica de evaluaciones).
* **CU19: Cancelar reserva de sala** (Docente solicitante desiste voluntariamente antes del inicio).
* **CU20: Gestionar reservas de sala** (Aprobación o Rechazo con dictamen formal por Jefatura y opción de **Aprobación Masiva en Lote para clases recurrentes**).

#### 2. Inventario de Archivos del Módulo 5
```
citef_backend/src/modules/reservas/
├── entities/
│   └── reserva-sala.entity.ts
├── dto/
│   ├── solicitar-reserva.dto.ts
│   ├── editar-reserva.dto.ts
│   ├── responder-reserva.dto.ts
│   └── consultar-reservas-filtro.dto.ts
├── services/
│   ├── algoritmo-disponibilidad.service.ts # Motor matemático de detección de solapamientos horarios y prioridad
│   └── reservas.service.ts                # Ciclo de vida: PENDIENTE -> APROBADA / RECHAZADA / CANCELADA + Lotes
├── controllers/
│   └── reservas.controller.ts
└── reservas.module.ts

citef_frontend/src/app/pages/reservas/
├── calendario/
│   ├── calendario-reservas.component.ts # Agenda interactiva con bloques cromáticos por tipo y vista de día dinámica
│   ├── calendario-reservas.component.html
│   └── calendario-reservas.component.css
└── gestion/
    ├── bandeja-gestion-reservas.component.ts # Bandeja para Jefatura con KPIs, dictamen formal y aprobación en lote
    ├── bandeja-gestion-reservas.component.html
    └── bandeja-gestion-reservas.component.css
```

#### 3. Esquema de Base de Datos y Entidades
* **Tabla `reserva_sala`:**
  * `id_reserva`: SERIAL PRIMARY KEY.
  * `id_sala`: INT REFERENCES `laboratorio_sala(id_sala)`.
  * `codigo_docente`: VARCHAR(30) REFERENCES `docente(codigo)`.
  * `id_materia`: INT REFERENCES `materia(id_materia)`.
  * `fecha_reserva`: DATE NOT NULL.
  * `hora_inicio`: TIME NOT NULL.
  * `hora_fin`: TIME NOT NULL.
  * `cant_estimada_alumnos`: SMALLINT NOT NULL (Aforo asignado a la sala física individual).
  * `cant_total_alumnos`: SMALLINT NULL (Total global de alumnos para reservas multi-sala).
  * `id_grupo_multisala`: VARCHAR(50) NULL (`GRP_...` que vincula solicitudes multi-sala simultáneas).
  * `salas_grupo`: JSONB NULL (Metadatos de las salas y aforos coordinados).
  * `tema_practica`: VARCHAR(150) NOT NULL.
  * `tipo_reserva`: VARCHAR(20) NOT NULL DEFAULT 'CLASE' (`CLASE`, `EXAMEN`).
  * `estado`: VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' (`PENDIENTE`, `APROBADA`, `EN_CURSO`, `RECHAZADA`, `CANCELADA`, `FINALIZADA`).
  * `editada`: BOOLEAN NOT NULL DEFAULT false (Indicador reactivo de modificación para revisión o acuse).
  * `notificacion_docente`: TEXT NULL (Aviso administrativo o de reprogramación prioritaria).
  * `id_lote_recurrente`: VARCHAR(50) NULL (`SEM_...` para programación semestral recurrente).
  * `obs_resolucion`: TEXT NULL (Dictamen formal de Jefatura).
  * `id_usuario_administrador`: BIGINT NULL REFERENCES `usuario(id_usuario)`.
  * `creado_en`: TIMESTAMP DEFAULT NOW().
  * `actualizado_en`: TIMESTAMP DEFAULT NOW().

#### 4. Motor Algorítmico de No-Solapamiento, Multi-Sala y Prioridad Académica (CU18)
Dos intervalos de reserva $A = [I_A, F_A]$ y $B = [I_B, F_B]$ para la misma sala y en la misma fecha colisionan si y solo si:
$$\max(I_A, I_B) < \min(F_A, F_B)$$
El backend ejecuta esta verificación en SQL nativo indexado:
```sql
SELECT id_reserva, tipo_reserva FROM reserva_sala 
WHERE id_sala = :idSala 
  AND fecha_reserva = :fecha 
  AND estado IN ('APROBADA', 'EN_CURSO')
  AND (hora_inicio < :horaFin AND hora_fin > :horaInicio)
LIMIT 1;
```
* **Regla de Prioridad de Examen:** Si se solicita un `EXAMEN` sobre una franja con `CLASE` ordinaria aprobada, el motor otorga prioridad al examen, desplazando la clase a estado `PENDIENTE` y generando una notificación formal inalterable al docente titular (`notificacion_docente`).
* **Soporte Multi-Sala Proporcional:** Para cursos numerosos (>30 estudiantes), el docente puede seleccionar múltiples salas. El motor valida que la suma de aforos cubra el total requerido ($N \le \sum C_i$) y distribuye proporcionalmente a la capacidad física de cada laboratorio sin desbordamientos ($C_i$).
* **Aprobación Masiva en Lote para Cátedras Semestrales (`aprobar_todas_recurrentes`):**
  Al dictaminar la aprobación de una clase en el modal de Jefatura, se dispone de la opción *"Aprobar en lote todas las clases recurrentes de este semestre"*. El backend evalúa la disponibilidad de cada fecha del semestre vinculada por `id_lote_recurrente` y aprueba masivamente hasta 30+ clases en una sola transacción, omitiendo de forma segura aquellas fechas puntuales que tengan conflicto.
* **Persistencia Atómica en Edición de Sala (Individual vs Multi-Sala):**
  Al editar la sala (ej. cambio a `LAB-46`), `ReservasService.editar()` ejecuta una actualización atómica directa con `reservaRepository.update(id, { id_sala: 3, ... })` evitando sobreescrituras en el grafo relacional de TypeORM y eliminando registros huérfanos de multi-salas anteriores.
* **Vista de Día Dinámica estilo Google Calendar:**
  Particionamiento horizontal proporcional automático para reservas simultáneas en diferentes salas dentro de la misma franja horaria, suprimiendo cabeceras fijas redundantes.

#### 5. Errores Comunes del Usuario y Validaciones Preventivas
* **Reserva en el Pasado:** No permitir registrar solicitudes con fechas u horas anteriores al momento actual.
* **Hora Fin menor o igual a Hora Inicio:** Validar estrictamente que `hora_fin > hora_inicio` con una duración mínima de 45 minutos.
* **Aprobación de Reserva Solapada:** Si dos docentes solicitaron el mismo horario y la Jefatura aprueba la primera, la segunda no puede aprobarse; el sistema debe alertar: *"Existe un conflicto horario insalvable con otra reserva aprobada"*.

---

### MÓDULO 6: TURNOS DE GUARDIA E INCIDENCIAS

#### 1. Casos de Uso Cubiertos
* **CU21: Registrar apertura, cierre y relevo de turno** (Checklists de sala, novedades y firmas/actas).
* **CU22: Reportar averías técnicas** (Detección de falla vinculando automáticamente al último estudiante sentado).
* **CU23: Gestionar objetos extraviados** (Libro digital de pertenencias halladas y acta de restitución).

#### 2. Inventario de Archivos del Módulo 6
```
citef_backend/src/modules/turnos/
├── entities/
│   ├── jornada-turno.entity.ts
│   ├── acta-relevo.entity.ts
│   ├── averia-equipo.entity.ts
│   └── objeto-extraviado.entity.ts
├── dto/
│   ├── abrir-turno.dto.ts
│   ├── cerrar-turno.dto.ts
│   ├── reportar-averia.dto.ts
│   └── registrar-objeto-extraviado.dto.ts
├── services/
│   ├── turnos.service.ts
│   ├── averias.service.ts
│   └── objetos-extraviados.service.ts
├── controllers/
│   ├── turnos.controller.ts
│   ├── averias.controller.ts
│   └── objetos-extraviados.controller.ts
└── turnos.module.ts

citef_frontend/src/app/pages/turnos/
├── control-guardia/
│   └── control-guardia.component.ts     # Checklist de apertura/cierre de sala y novedades
├── acta-relevo/
│   └── acta-relevo.component.ts         # Visualización y conformidad del relevo entre auxiliares
├── averias/
│   └── averias.component.ts             # Reporte con detección automática del último alumno
└── objetos-extraviados/
    └── objetos-extraviados.component.ts # Libro de objetos encontrados y entrega formal
```

#### 3. Esquema de Base de Datos y Entidades
* **Tabla `jornada_turno`:**
  * `id_jornada`: SERIAL PRIMARY KEY.
  * `id_usuario_auxiliar`: INT REFERENCES `usuario(id_usuario)`.
  * `id_sala`: INT REFERENCES `laboratorio_sala(id_sala)`.
  * `fecha`: DATE NOT NULL.
  * `hora_apertura`: TIMESTAMP DEFAULT NOW().
  * `hora_cierre`: TIMESTAMP NULL.
  * `checklist_apertura`: JSONB NOT NULL (luces, orden, aire acondicionado, número de PCs encendidas).
  * `checklist_cierre`: JSONB NULL.
  * `estado`: VARCHAR(20) NOT NULL DEFAULT 'ABIERTO' (`ABIERTO`, `CERRADO`, `RELEVADO`).
* **Tabla `acta_relevo`:**
  * `id_acta`: SERIAL PRIMARY KEY.
  * `id_jornada`: INT REFERENCES `jornada_turno(id_jornada)` ON DELETE CASCADE (Relación de composición: el formulario de cierre / acta de relevo formaliza la culminación indivisible de la jornada diaria).
  * `id_usuario_entrante`: INT REFERENCES `usuario(id_usuario)`.
  * `cant_equipos_operativos`: INT NOT NULL.
  * `novedades`: TEXT NULL.
  * `fecha_hora_conformidad`: TIMESTAMP DEFAULT NOW().
* **Tabla `averia_equipo`:**
  * `id_averia`: SERIAL PRIMARY KEY.
  * `id_computadora`: INT REFERENCES `computadora(id_computadora)`.
  * `registro_ultimo_estudiante`: VARCHAR(30) NULL REFERENCES `estudiante(registro)`.
  * `id_reserva`: INT NULL REFERENCES `reserva_sala(id_reserva)`.
  * `descrip_falla`: TEXT NOT NULL.
  * `gravedad`: VARCHAR(20) NOT NULL (`BAJA`, `MEDIA`, `CRITICA`).
  * `estado`: VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE_REVISION' (`PENDIENTE_REVISION`, `EN_TALLER`, `REPARADO`, `DESCARTADO`).
  * `fecha_reporte`: TIMESTAMP DEFAULT NOW().
* **Tabla `objeto_extraviado`:**
  * `id_objeto`: SERIAL PRIMARY KEY.
  * `id_sala`: INT REFERENCES `laboratorio_sala(id_sala)`.
  * `descrip`: VARCHAR(255) NOT NULL (ej: `Cuaderno espiral tapa azul con apuntes de Finanzas`).
  * `lugar_exacto`: VARCHAR(100) NOT NULL (ej: `Mesa PC-14`).
  * `fecha_hallazgo`: TIMESTAMP DEFAULT NOW().
  * `entregado`: BOOLEAN NOT NULL DEFAULT FALSE.
  * `registro_estudiante_receptor`: VARCHAR(30) NULL REFERENCES `estudiante(registro)`.
  * `fecha_entrega`: TIMESTAMP NULL.

---

### MÓDULO 7: SOPORTE TÉCNICO Y MANTENIMIENTO RAMS

#### 1. Casos de Uso Cubiertos
* **CU24: Registrar mantenimiento de equipos** (Técnico recibe equipo averiado en taller, registra diagnóstico y repuestos).
* **CU25: Confirmar retorno a sala** (Puesta en marcha, reinstalación física y cálculo de indicadores MTBF y MTTR).

#### 2. Inventario de Archivos del Módulo 7
```
citef_backend/src/modules/soporte/
├── entities/
│   └── mantenimiento-taller.entity.ts
├── dto/
│   ├── iniciar-mantenimiento.dto.ts
│   └── finalizar-mantenimiento.dto.ts
├── services/
│   ├── soporte.service.ts
│   └── metricas-rams.service.ts         # Cálculo matemático de MTBF, MTTR y Disponibilidad A
├── controllers/
│   └── soporte.controller.ts
└── soporte.module.ts

citef_frontend/src/app/pages/soporte/
├── bandeja-taller/
│   └── bandeja-taller.component.ts      # Tablero Kanban / lista de órdenes técnicas para hardware
└── metricas-rams/
    └── metricas-rams.component.ts       # Tablero de confiabilidad de equipos (MTBF, MTTR, Disponibilidad)
```

#### 3. Fórmulas de Confiabilidad y Mantenimiento (RAMS)
* **MTTR (Mean Time To Repair - Tiempo Medio de Reparación):**
  $$\text{MTTR} = \frac{\sum (\text{Fecha Salida Taller} - \text{Fecha Ingreso Taller})}{\text{Total Reparaciones}}$$
* **MTBF (Mean Time Between Failures - Tiempo Medio Entre Fallas):**
  $$\text{MTBF} = \frac{\text{Horas Operativas Totales en Sala}}{\text{Número Total de Averías Registradas}}$$
* **Disponibilidad Inherente ($A$):**
  $$A = \frac{\text{MTBF}}{\text{MTBF} + \text{MTTR}} \times 100\%$$

#### 4. Reglas de Negocio, Integración y Seguridad del Módulo 7
* **Transición Automática desde Gestión de Averías (CU22 $\rightarrow$ CU24):**
  Cuando un auxiliar o administrador cambia el estado de una avería a `EN_TALLER` ("Traslado a Taller"), el backend crea automáticamente un registro en `mantenimiento_taller` con estado `PENDIENTE_TALLER` y prioridad acorde a la falla. La computadora se inactiva a estado `EN_MANTENIMIENTO`. Queda prohibido el registro manual redundante de órdenes en taller.
* **Alcance Granular del Rol Técnico:**
  Los usuarios con rol `TECNICO` únicamente visualizan en la bandeja de taller las órdenes que tienen asignadas expresamente (`id_usuario_tecnico = idUsuario`). El rol `ADMINISTRADOR` conserva visibilidad y administración completa.
* **Selector de Técnicos Calificados:**
  El endpoint `GET /api/v1/soporte/tecnicos` filtra de manera estricta a usuarios con rol `TECNICO` activos, excluyendo cualquier otro estamento universitario.
* **Impresión Formal en Tablas Institucionales (Cero Capturas):**
  Las vistas imprimibles (Ficha de Taller, Tablero RAMS, Acta de Relevo) cuentan con formateo `@media print` que suprime la barra superior, el menú lateral, los filtros de búsqueda y los botones interactivos. Renderiza un documento formal con membrete oficial FCEE UAGRM y tablas de datos estructuradas en blanco y negro de alto contraste.
* **Interfaz de Filtros Compacta:**
  Las barras de filtros suprimen los títulos `<label>` encima de cada selector, manteniendo un diseño limpio y directo con placeholders descriptivos y botones de acción principal en Azul Marino Institucional (`#002855`).

---

### MÓDULO 8: ANALÍTICA PREDICTIVA, DASHBOARD EJECUTIVO Y REPORTES (MÁXIMA PRIORIDAD PARA DEFENSA II)

> [!IMPORTANT]
> **Enfoque Estratégico para Defensa II:** De acuerdo con las directrices de la mesa examinadora, el módulo de reportes y analítica constituye el componente de mayor peso evaluativo en la titulación. Se exige la presentación de un **Dashboard Gerencial interactivo** con métricas en tiempo real, variedad de gráficos estadísticos (tortas, barras, líneas, heatmaps), exportación formal en PDF institucional y Excel (.xlsx) estructurado, y el microservicio de inferencia de saturación mediante Machine Learning ($M/M/c$).

#### 1. Casos de Uso Cubiertos
* **CU26: Generar pronóstico de demanda y análisis de colas** (Inferencia de saturación mediante Machine Learning + Teoría de Colas $M/M/c$).
* **CU27: Generar reportes dinámicos y consultas analíticas** (Dashboard gerencial en tiempo real, KPIs estratégicos, gráficos interactivos, exportación oficial en PDF institucional con membrete UAGRM y libros de cálculo Excel para Decanatura y Acreditación).

#### 2. Componentes Clave del Dashboard Ejecutivo (Frontend Angular 18)
El panel gerencial (`dashboard-gerencial.component.ts`) presenta una consola de mando para la toma de decisiones basada en datos:
1. **Tarjetas de KPIs Gerenciales en Tiempo Real:**
   * *Tasa Global de Ocupación de Laboratorios (%):* Ocupación actual respecto a la capacidad instalada física total.
   * *Total Horas Cátedra Dictadas:* Acumulado semestral de horas académicas en laboratorios para reportes de acreditación.
   * *Índice de Evaluaciones Prioritarias:* Contador de exámenes programados con prioridad académica y clases regularizadas.
   * *Tiempo Promedio de Permanencia:* Duración media por sesión de estudiante en minutos ($W_s$).
   * *Salud del Parque de Cómputo:* Máquinas operativas vs computadoras en mantenimiento preventivo o correctivo (RAMS).
   * *Efectividad de Mitigación Algorítmica:* Contador de colisiones horarias insalvables prevenidas por el motor matemático.
2. **Batería de Gráficos Analíticos Dinámicos e Interactivos:**
   * **Gráfico Donut / Torta:** Distribución porcentual de demanda por Carrera Curricular (Economía, Administración de Empresas, Contaduría Pública, Ingeniería Comercial, Ingeniería Financiera, etc.).
   * **Gráficos de Barras Agrupadas:** 
     - Comparativa de aforo y utilización por cada Laboratorio (`LAB-01` a `LAB-46`).
     - Distribución de concurrencia y afluencia por día de la semana (Lunes a Sábado).
   * **Gráfico de Líneas Temporal (Line Chart):** Evolución de la demanda horaria semanal y comparativa de horas programadas vs ejecutadas en el mes.
   * **Mapa de Calor Horario (Heatmap):** Matriz de densidad de concurrencia hora a hora (de 07:00 a 22:00) para detectar picos críticos de saturación y franjas de disponibilidad ociosa.
3. **Módulo de Exportación Multi-Formato Oficial FCEE:**
   * **PDF Institucional Formal:** Compilado con membrete oficial de la FCEE - UAGRM, tipografía formal, firmas digitales de Decanatura y Jefatura de Laboratorios, sellos de agua de auditoría, paginación reglamentaria y hash SHA-256 de integridad.
   * **Excel Estructurado (`.xlsx`):** Libro con hojas de cálculo estructuradas, cabeceras normalizadas y fórmulas numéricas nativas para auditorías de acreditación y presupuesto facultativo.
4. **Catálogo de 5 Reportes Institucionales Específicos:**
   1. *Reporte de Cátedras y Cumplimiento Docente:* Asistencias, horas dictadas por materia, grupo y docente titular.
   2. *Reporte de Ocupación y Eficiencia de Aulas:* Tasa de utilización, horarios pico y horas ociosas por laboratorio.
   3. *Reporte de Salud de Infraestructura y Mantenimiento RAMS:* Ficha técnica de computadoras, horas de uso acumuladas, averías, MTBF, MTTR y disponibilidad ($A$).
   4. *Reporte de Prioridad Académica y Evaluaciones:* Registro de exámenes parciales/finales y clases regularizadas.
   5. *Reporte Forense de Auditoría Transaccional:* Trazabilidad completa de operaciones registradas por el Administrador y operadores.

#### 3. Inventario de Archivos del Módulo 8
```
citef_backend/src/modules/analitica/
├── entities/
│   ├── ejecucion-ml.entity.ts
│   ├── pronostico-saturacion.entity.ts
│   ├── documento-reporte-exportado.entity.ts # Registro y descarga de archivos PDF/Excel
│   └── bitacora-consulta-asistente.entity.ts
├── dto/
│   ├── generar-reporte-filtro.dto.ts
│   ├── parametrizar-dashboard.dto.ts
│   └── consultar-asistente-nlp.dto.ts
├── services/
│   ├── metricas-dashboard.service.ts   # Cálculo de KPIs, agregaciones por carrera, sala y heatmap
│   ├── exportacion-reportes.service.ts # Generación server-side de PDF con membrete y libros Excel (.xlsx)
│   ├── analitica-predictiva.service.ts # Orquestación con microservicio FastAPI
│   └── asistente-sql.service.ts        # Procesador Text-to-SQL seguro sobre réplica de lectura
├── controllers/
│   ├── metricas.controller.ts
│   ├── reportes.controller.ts
│   └── asistente-sql.controller.ts
├── clients/
│   └── analytics-fastapi.client.ts     # Cliente Axios HTTP hacia FastAPI (puerto 8001)
└── analitica.module.ts

citef_frontend/src/app/pages/analitica/
├── dashboard-gerencial/
│   ├── dashboard-gerencial.component.ts # Dashboard ejecutivo con KPIs y gráficas dinámicas
│   ├── dashboard-gerencial.component.html
│   └── dashboard-gerencial.component.css
├── reportes-oficiales/
│   ├── reportes-oficiales.component.ts  # Generador y catálogo de reportes PDF y Excel
│   ├── reportes-oficiales.component.html
│   └── reportes-oficiales.component.css
└── pronostico-saturacion/
    ├── pronostico-saturacion.component.ts # Visualización de curvas de ML y teoría de colas M/M/c
    ├── pronostico-saturacion.component.html
    └── pronostico-saturacion.component.css
```

#### 4. Arquitectura del Microservicio Predictivo (`citef_analytics_fastapi`)
El microservicio se ejecuta en Python 3 / FastAPI (puerto 8001), totalmente desacoplado del backend NestJS:
```
citef_analytics_fastapi/
├── main.py
├── requirements.txt
├── ml/
│   ├── pipeline_rf.py                   # RandomForestRegressor entrenado con historial de uso
│   └── predictor.py                     # Inferencia de demanda esperada
├── math/
│   └── colas_mmc.py                     # Cálculo de modelo M/M/c (Erlang-C, Wq, factor rho)
└── endpoints/
    └── prediccion.py                    # Endpoint POST /api/v1/ml/predecir-demanda
```

#### 5. Consumo Seguro desde NestJS y Presentación en Frontend
* El backend NestJS actúa como pasarela segura mediante Axios en `analytics-fastapi.client.ts`.
* El panel en Angular renderiza los gráficos mediante componentes modulares basados en SVG/Canvas o librerías estándar libres de dependencias obsoletas, respetando los colores institucionales FCEE (`#A81124`, `#002855`).
* La exportación genera archivos inalterables firmados criptográficamente para su presentación directa ante los tribunales de grado de la UAGRM.

---

## 5. Matriz de Comandos de Inicialización, Migración, Seeders y Pruebas

### 5.1. Base de Datos PostgreSQL Nativa (Local)
* **Host:** `localhost:5432`
* **Base de Datos:** `citef_db`
* **Usuario:** `postgres`
* **Contraseña:** `postgres`

### 5.2. Backend NestJS (`citef_backend`)
```bash
# 1. Instalar dependencias
cd /home/nataly/Projects/laboratorios/citef_backend
npm install

# 2. Compilar TypeScript
npm run build

# 3. Ejecución controlada del Seeder (Solo cuando se requiera inicializar o resetear datos)
npm run seed

# 4. Ejecutar pruebas unitarias (9/9 passing)
npm test

# 5. Iniciar servidor en desarrollo (El usuario lo ejecuta en su terminal)
npm run start:dev
# URL API: http://localhost:3000/api/v1
# Swagger UI: http://localhost:3000/api/docs
```

### 5.3. Frontend Angular (`citef_frontend`)
```bash
# 1. Instalar dependencias
cd /home/nataly/Projects/laboratorios/citef_frontend
npm install

# 2. Compilar la aplicación (Verificar cero errores)
npm run build

# 3. Iniciar servidor local (El usuario lo ejecuta en su terminal)
npm start
# URL Web: http://localhost:4200
```

### 5.4. Microservicio Predictivo Python (`citef_ia_service` / `citef_analytics_fastapi`)
```bash
# 1. Activar entorno virtual
source venv/bin/activate

# 2. Instalar requerimientos
pip install -r requirements.txt

# 3. Iniciar servicio FastAPI en puerto 8001
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

---

## 6. Instrucciones Estrictas para Agentes Autónomos de Desarrollo

Cuando un agente deba implementar o corregir cualquier módulo del sistema:
1. **Regla 1 (Puertos Libres):** Nunca dejar el comando de arranque del servidor ejecutándose en background (`IsDaemon: true`). El usuario levantará los servicios en sus terminales independientes.
2. **Regla 2 (No Emojis):** Verificar que ningún archivo `.html`, `.ts` ni mensaje contenga emojis. Emplear exclusivamente `<i class="bi bi-*"></i>`.
3. **Regla 3 (Acciones de Fila Obligatorias):** Cada tabla de gestión debe contener el lápiz de edición (`bi bi-pencil`) y el basurero de eliminación (`bi bi-trash3`). La eliminación siempre debe abrir `ConfirmModalComponent`.
4. **Regla 4 (Botón Buscar y Limpiar):** Toda barra de filtros debe poseer su botón "Buscar" y su botón "Limpiar". Los filtros no deben desactivar la tabla ni congelar la paginación.
5. **Regla 5 (Selectores Compactos):** Prohibido usar tarjetas grandes con textos largos dentro de formularios; usar `<select>` o chips compactos.
6. **Regla 6 (Compilación Limpia Obligatoria):** Antes de concluir la tarea, el agente debe ejecutar `npm run build` en el frontend y en el backend, certificando cero errores de compilación (`code 0`).
7. **Regla 7 (Validaciones en Letras Rojas en Modales):** En cualquier modal de creación o edición de todos los módulos del sistema (Módulos 1 al 8), los errores de validación de campos vacíos o datos que no cumplan restricciones deben presentarse en letras rojas descriptivas debajo del campo afectado (`.field-error-text`) y con borde en rojo (`.input-error`). Prohibido deshabilitar botones de forma muda sin feedback. Si el backend rechaza la operación, el mensaje de error debe mostrarse dentro del modal en un banner rojo (`.modal-alert-danger`) sin cerrarlo.
8. **Regla 8 (Paginación Máxima de 10 Registros):** Todas las tablas del sistema deben paginar a un máximo de 10 filas por vista, con controles interactivos funcionales para navegar adelante y atrás.
9. **Regla 9 (Control de Acceso Granular RBAC y Sidebar Dinámico):** Los controladores del backend deben protegerse mediante `@Permisos(...)` respetando la matriz RBAC. Si un rol no administrador recibe un permiso (ej. Auxiliar con permiso de ver bitácora o crear usuarios), tanto el backend como el sidebar del frontend deben autorizar y mostrar inmediatamente dichas secciones.
10. **Regla 10 (Impresión Profesional en Tablas Oficiales - Cero Screenshots):** En todas las vistas que requieran comprobantes físicos o reportes oficiales (Ficha Técnica de Taller, Tablero de Confiabilidad RAMS, Acta de Relevo de Guardia), el motor `@media print` debe ocultar completamente la barra superior, el menú lateral, los filtros de búsqueda y los botones interactivos. La impresión debe consistir exclusivamente en tablas estructuradas con membrete oficial institucional FCEE UAGRM de alto contraste.

---

## 7. Resumen de Actualizaciones y Control de Versiones del Documento

| Versión | Fecha | Módulos Actualizados | Detalle de Mejoras Técnicas y Ajustes Metodológicos |
| :--- | :--- | :--- | :--- |
| **v2.6** | 2026-10-25 | Módulo 8 (Analítica Predictiva y Reportes), Sistema Global | **1. Módulo 8 Completado y Certificado al 100% (CU26 y CU27 - Máxima Prioridad de Defensa II):** Implementación integral del subsistema de inteligencia institucional compuesto por microservicio Python FastAPI (puerto 8001), backend modular NestJS y frontend Angular 18 Standalone.<br>**2. Analítica Predictiva y Teoría de Colas $M/M/c$ (CU26):** Microservicio desacoplado con modelo `RandomForestRegressor` ($R^2 = 0.9819$) para proyección de demanda horaria y motor estocástico de Erlang-C para cálculo de $\rho$, $W_q$, $L_q$, $P_c$ y dimensionamiento óptimo de puestos.<br>**3. Fallback Autónomo Resiliente en Backend:** Si el microservicio FastAPI se desconecta, `AnalyticsFastApiClient` en NestJS conmuta de forma transparente al cálculo matemático en TypeScript local sin interrumpir la experiencia de usuario.<br>**4. Dashboard Ejecutivo y Batería de Gráficos SVG (CU27):** Consola gerencial interactiva con 6 KPIs en tiempo real y 4 variedades de gráficos SVG nativos institucionales (Donut por Carrera, Barras agrupadas por Sala y Día, Línea temporal horaria y Heatmap de 07:00 a 22:00).<br>**5. Catálogo de Reportes Oficiales Acreditables (CU27):** 5 reportes estratégicos institucionales con descarga real de libros Excel (`.xlsx`) estructurados y generación de actas oficiales PDF con membrete formal, firmas facultativas y hash SHA-256 de inalterabilidad.<br>**6. Certificación Global:** 141/141 pruebas unitarias Jest aprobadas (22 suites, 0 fallos), 13/13 pruebas unitarias Python aprobadas y compilación limpia con código 0 en backend y frontend. |
| **v2.5** | 2026-10-25 | Módulo 7 (Soporte RAMS), Módulo 6 (Turnos), Directrices Globales de Impresión | **1. Regla Inviolable 10 de Impresión Oficial:** Implementación de motor CSS `@media print` universal que transforma comprobantes, fichas y reportes en documentos formales estructurados en tablas de alta legibilidad con membrete FCEE UAGRM, suprimiendo menús, barras de filtros y botones interactivos.<br>**2. Transición Automática Averías $\rightarrow$ Taller (CU22 $\rightarrow$ CU24):** Al marcar una falla en estado `EN_TALLER`, el backend genera de inmediato la orden de trabajo en `mantenimiento_taller` e inhabilita la estación en sala a `EN_MANTENIMIENTO`, eliminando la redundancia de registro manual.<br>**3. Restricción Granular del Rol Técnico:** Filtrado estricto en la bandeja de taller para que usuarios con rol `TECNICO` únicamente visualicen las intervenciones asignadas a su persona.<br>**4. Estandarización Visual Institucional:** Botones principales en Azul Marino FCEE (`#002855`), supresión de etiquetas `<label>` redundantes en barras de filtros, y eliminación de textos sobreexplicativos en modales y tarjetas. |
| **v2.4** | 2026-10-25 | Módulo 7 (Soporte y RAMS), Matriz Relacional | **1. Módulo 7 Completado y Certificado (CU24 y CU25):** Persistencia TypeORM, lógica de negocio transaccional y vistas SPA (Angular 18 Standalone) para el flujo de taller de hardware y confiabilidad RAMS.<br>**2. Gestión de Órdenes de Mantenimiento (CU24):** Recepción técnica, diagnóstico preliminar, solución aplicada, repuestos del inventario y medición del tiempo en banco de trabajo para cómputo de MTTR.<br>**3. Protocolo de Retorno Físico a Sala y WebSockets (CU25):** Reinstalación con validación de encendido y red, conmutación automática a `DISPONIBLE`, sincronización en tiempo real vía `OcupacionGateway` y cierre de avería como `REPARADO`.<br>**4. Indicadores de Confiabilidad RAMS:** Algoritmos matemáticos consolidados de MTTR, MTBF y Disponibilidad Operativa ($A = \frac{\text{MTBF}}{\text{MTBF} + \text{MTTR}} \times 100\%$) con semaforización oficial FCEE.<br>**5. UI/UX FCEE:** Vistas Bandeja Taller y Métricas RAMS integradas al sidebar en acordeón bajo "Soporte", paginación de 15 filas, validaciones en letras rojas y cero emojis.<br>**6. Certificación Global:** 116/116 pruebas unitarias Jest aprobadas (19 suites, 0 fallos) y compilación limpia con código 0 en backend y frontend. |
| **v2.3** | 2026-10-24 | Módulo 6 (Turnos e Incidencias), Esquema Relacional de Centralidad | **1. Módulo 6 Completado y Certificado (CU21, CU22, CU23):** Implementación integral de persistencia (NestJS TypeORM), lógica de negocio transaccional y vistas SPA (Angular 18 Standalone) para turnos de guardia, actas de relevo, averías técnicas y objetos extraviados.<br>**2. Checklist Estructurado JSONB y Traspaso Digital (CU21):** Apertura formal con verificación de sala, cierre consolidado y acta de relevo (Handover) con firma digital de conformidad y discrepancias.<br>**3. Auto-Vinculación Contextual de Averías (CU22):** Identificación automática del último estudiante o reserva académica asociada a una estación averiada, inhabilitando el equipo a `EN_MANTENIMIENTO` en tiempo real.<br>**4. Libro Digital de Pertenencias Halladas (CU23):** Registro físico por puesto, custodia y restitución formal validando RU/CI del estudiante.<br>**5. Centralidad del Administrador (image copy 4.png):** 17 llaves foráneas activas hacia `Usuario`, consolidando la trazabilidad de autoría forense en todas las entidades del CITEF.<br>**6. Certificación Global:** 95/95 pruebas unitarias Jest aprobadas (0 fallos) y compilación limpia con código 0 en backend y frontend. |
| **v2.2** | 2026-10-23 | Módulo 5 (Reservas), Módulo 8 (Reportes y BI), Reglas de Defensa II | **1. Módulo de Reportes como Máxima Prioridad de Titulación (Defensa II):** Especificación completa del Dashboard Ejecutivo interactivo en tiempo real con 6 KPIs estratégicos, 4 variedades de gráficos (Donut/Torta por carrera, Barras por sala y días, Líneas temporales de demanda, Heatmap horario 07:00 a 22:00), exportador oficial a PDF con membrete UAGRM FCEE y libros Excel (.xlsx) estructurados.<br>**2. Aprobación en Lote de Cátedras Semestrales (Módulo 5):** Incorporación del dictamen masivo mediante `aprobar_todas_recurrentes` en `ResponderReservaDto` y `ReservasService.gestionar()`, permitiendo aprobar hasta 30+ clases semestrales con un solo clic.<br>**3. Persistencia Atómica en Edición de Sala:** Reasignación certera a laboratorios individuales como LAB-46 mediante `reservaRepository.update` y depuración automática de registros secundarios de grupo.<br>**4. Vista Diaria Particionada (Google Calendar):** Particionamiento horizontal proporcional en la vista de día sin cabeceras fijas redundantes.<br>**5. Prioridad Académica y Aforo Multi-Sala:** Reglas de desplazamiento de clases por exámenes y reparto proporcional de estudiantes sin sobrecupo. |
| **v2.1** | 2026-10-20 | Módulos 1 al 5 | Inclusión de endpoints de catálogos transversales, solución a errores 403 para docentes y auxiliares, paleta institucional FCEE UAGRM y cero emojis en Angular 18. |
| **v2.0** | 2026-10-16 | Documento Completo | Normalización RUP / UML 2.5 de casos de uso CU1 a CU27, matriz de permisos RBAC y catálogo de componentes compartidos. |
| **v1.0** | 2026-10-10 | Documento Completo | Plan maestro inicial de desarrollo para el Sistema CITEF FCEE UAGRM. |
