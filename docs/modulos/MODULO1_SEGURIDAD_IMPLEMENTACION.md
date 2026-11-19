# MÓDULO 1: SEGURIDAD, ACCESO Y AUDITORÍA - CITEF FCEE UAGRM
**Documento Técnico de Implementación y Guía de Verificación**

---

## 1. Resumen Ejecutivo del Módulo 1 (Revisión Final y Correcciones de UI/UX)

En este primer módulo se implementó la arquitectura de software base para la seguridad, autenticación, control de acceso basado en roles (**RBAC**) y auditoría forense del sistema para el Centro de Información y Tecnología (**CITEF**) de la Facultad de Ciencias Económicas y Empresariales (**FCEE**) de la **UAGRM**.

### Correcciones y Mejoras Implementadas:
1. **Validación de Correo Electrónico:** Se eliminó la restricción rígida de forzar el dominio `@uagrm.edu.bo`. Se permite el registro de correos electrónicos generales (`@gmail.com`, `@hotmail.com`, etc.) manteniendo validación formal RFC de correo electrónico.
2. **Interfaz Profesional y Formal (Sin Emojis):**
   - **Cero Emojis:** Sustituidos en su totalidad por la librería oficial vectorial **Bootstrap Icons** (`bi bi-*`).
   - **Logos Institucionales:** Uso del logo transparente de la facultad (`logoTransparente.png`) en el header, pantalla de login y pie de página, con la paleta de colores oficial FCEE (Rojo Carmesí `#A81124` y Azul Marino `#002855`).
   - **Sidebar Limpio:** Se eliminó el texto innecesario, números de caso (`CU1`, `CU2`, etc.) y divisiones redundantes. La navegación es directa: **Usuarios**, **Roles y Permisos**, **Bitácora de Auditoría**.
3. **Gestión de Usuarios (CU1):**
   - **Acciones Estándar por Fila:** Cada usuario cuenta con su botón de edición (ícono de lápiz `bi bi-pencil`) y botón de baja (ícono de basurero `bi bi-trash3`).
   - **Modal de Edición Completo:** Permite modificar nombres, apellidos, teléfono, estado activo/inactivo y roles asignados.
   - **Modal de Confirmación Reutilizable (`ConfirmModalComponent`):** Antes de dar de baja o desactivar cualquier cuenta, se solicita confirmación explícita para evitar errores accidentales.
   - **Búsqueda y Filtros con Botón:** Cuenta con botón explícito **"Buscar"** y **"Limpiar"** para activar o desactivar filtros de forma dinámica, manteniendo la paginación interactiva estable.
   - **Selector de Roles Compacto:** Se eliminaron las tarjetas con descripciones excesivas; ahora se utilizan selectores limpios tipo chip/badge con checkboxes integrados.
4. **Recuperación de Contraseña por Correo (CU2):**
   - **Servicio Transaccional Brevo (API REST HTTPS):** Al solicitar recuperación, el backend envía un correo electrónico mediante la API REST HTTPS de Brevo con plantilla HTML formal y un enlace directo seguro: `http://localhost:4200/recuperar-password?token=...`. Permite despachar hasta 300 correos diarios a cualquier buzón sin requerir dominio DNS verificado ni protocolos SMTP obsoletos.
   - **Protección del Token:** La interfaz jamás genera ni muestra el token criptográfico en pantalla. El usuario accede mediante el enlace de su correo, la pantalla captura el parámetro `?token=` y solicita únicamente su nueva contraseña.
   - **Eliminación de Clave por Admin:** Se eliminó la función donde el administrador le definía contraseñas a los usuarios, respetando la privacidad del usuario.
5. **Roles y Matriz de Permisos (CU3):**
   - **Diseño Responsivo y Limpio:** Se sustituyeron las tarjetas desproporcionadas por una tabla formal de roles con contador de permisos y botón de configuración.
   - **Matriz de Permisos Filtrable:** Tabla responsiva con buscador en tiempo real, filtro por rol y visualización de permisos asignados.
   - **Modal de Configuración Granular:** Permite alternar módulos completos o permisos individuales con diseño adaptable a pantallas de laptops y tablets.
6. **Seeder Manual Independiente:**
   - El seeder ya no se ejecuta automáticamente al iniciar la aplicación. Se ejecuta bajo demanda de forma manual mediante `npm run seed`.
7. **Validación Visual en Letras Rojas dentro de Modales (CU1):**
   - Eliminación de botones mudos o bloqueados sin explicación.
   - Mensajes específicos en letras rojas institucionales (`#DC2626`) debajo de cada campo con fallos (`.field-error-text`) y borde en rojo (`.input-error`).
   - Banners de alerta dentro del modal (`.modal-alert-danger`) si el backend rechaza la petición (ej: correo duplicado).
8. **Paginación Estándar de 15 Registros y Componentes Compartidos:**
   - Tablas de Usuarios, Bitácora y Matriz de Permisos configuradas estrictamente a **15 registros por página** con controles alineados a la derecha en la esquina inferior.
   - Creación de componentes compartidos en `citef_frontend/src/app/shared/components/`:
     - `<app-pagination>` (`PaginationComponent`): Navegación unificada, botones numéricos, leyenda descriptiva y diseño limpio.
     - `<app-modal-alert>` (`ModalAlertComponent`): Despliegue estandarizado de alertas y errores en modales con paleta roja institucional (`#DC2626`).
     - `<app-table-card>` (`TableCardComponent`): Contenedor uniforme para tablas con ranuras de proyección para acciones y pie de página.
9. **Bitácora de Auditoría Compacta y Ordenable (CU4):**
   - Header de tabla estandarizado, compacto e idéntico al de Usuarios.
   - Flechas interactivas de ordenamiento bidireccional (ASC/DESC) funcionales tanto por ID como por Fecha y Hora.
10. **Sidebar Dinámico y Autorización Granular RBAC (CU3):**
    - Guardia `@Permisos(...)` en NestJS que permite acceso a cualquier rol con el permiso otorgado (ej: si a Auxiliar se le asigna ver bitácora o crear usuarios, puede acceder sin error 403).
    - Menú lateral en Angular reactivo a los permisos efectivos del usuario actual.
11. **Servicio de Correo Brevo REST API y `.env.example` (CU2):**
    - Desacoplamiento total de dependencias obsoletas (eliminado Nodemailer y Resend).
    - Integración de **Brevo REST API HTTPS** (`POST https://api.brevo.com/v3/smtp/email`): permite enviar 300 correos diarios a cualquier buzón destinatario sin requerir DNS corporativo ni validaciones restrictivas de dominio.
    - Modo desarrollo local que genera e imprime el token SHA-256 y el enlace de recuperación directamente en la terminal.
    - Archivo `citef_backend/.env.example` actualizado con guía detallada paso a paso para la generación de la clave API (`xkeysib-...`).
12. **Logs del Backend en Tiempo Real:**
    - Implementación de `HttpLoggerMiddleware` en `citef_backend/src/common/middleware/http-logger.middleware.ts` para registrar en consola cada solicitud entrante (método, ruta, código de estado, tiempo en ms e IP del cliente).
    - Logs enriquecidos en `UsuariosService`, `AuthService` y `AuditoriaService` para monitorear eventos clave (logins, altas, modificaciones, bajas y recuperación de contraseñas).

---

## 2. Casos de Uso Implementados y Resueltos

| Caso de Uso | Denominación | Detalle de la Solución Técnica |
| :--- | :--- | :--- |
| **CU1** | **Gestionar usuarios** | CRUD completo de cuentas con edición, baja con confirmación, filtros con botón Buscar/Limpiar, y encriptación **Bcrypt** (cost 10). |
| **CU2** | **Restablecer contraseña** | Flujo externo por correo electrónico: generación de token SHA-256 (64 hex) con validez estricta de **15 minutos**, enlace en plantilla HTML e invalidación tras un solo uso. |
| **CU3** | **Gestionar roles y permisos** | Arquitectura RBAC. Roles preconfigurados y catálogo de 27 permisos agrupados por módulos operativos, con edición de matriz mediante modal responsivo. |
| **CU4** | **Consultar bitácora de auditoría** | Registro automático de eventos (`LOGIN`, `INSERT`, `UPDATE`, `DELETE`, `RESET_PASSWORD`) persistidos en PostgreSQL con tipo `jsonb` para snapshot antes/después, IP y usuario responsable. |

---

## 3. Inventario de Archivos Creados y Modificados

### A. Frontend (`citef_frontend/`)
| Archivo | Tipo | Descripción |
| :--- | :--- | :--- |
| `src/app/shared/components/confirm-modal/confirm-modal.component.ts` | Componente Compartido | Modal reutilizable para confirmación de acciones críticas (baja/eliminación). |
| `src/app/layout/shell/shell.component.ts` | Layout Shell | Topbar institucional con logo transparente, sidebar limpio sin números de caso ni textos redundantes, y user-pill con iniciales. |
| `src/app/pages/login/login.component.ts` | Vista UI | Pantalla de autenticación formal con branding FCEE UAGRM y accesos rápidos sin emojis. |
| `src/app/pages/recuperar-password/recuperar-password.component.ts` | Vista UI (CU2) | Vista con soporte para captura de `?token=` desde enlace de correo y formulario de restablecimiento. |
| `src/app/pages/usuarios/usuarios.component.ts` | Vista UI (CU1) | Gestión con botón "Buscar"/"Limpiar", lápiz de edición, basurero con confirmación, y chips limpios de roles. |
| `src/app/pages/roles/roles.component.ts` | Vista UI (CU3) | Tabla formal de roles, buscador de permisos y modal responsivo para asignación de matriz RBAC. |
| `src/app/pages/auditoria/auditoria.component.ts` | Vista UI (CU4) | Registro cronológico con filtros dinámicos, paginación y visor modal forense JSON. |
| `src/app/core/services/usuarios.service.ts` | Servicio | Métodos para CRUD de usuarios, actualización de permisos de roles y endpoints de estado. |
| `src/app/core/services/auth.service.ts` | Servicio | Métodos de login, solicitud de recuperación y reset de clave por token. |
| `src/styles/theme-variables.css` | CSS Variables | Variables centralizadas de color: Carmesí `#A81124`, Azul Marino `#002855`, radios y sombras. |

### B. Backend (`citef_backend/`)
| Archivo | Tipo | Descripción |
| :--- | :--- | :--- |
| `src/modules/usuarios/usuarios.controller.ts` | Controlador | Endpoints REST de usuarios incluyendo `@Put(':id')` y `@Delete(':id')`. |
| `src/modules/usuarios/usuarios.service.ts` | Servicio | Lógica de negocio con auditoría automática de inserciones, actualizaciones y bajas. |
| `src/modules/usuarios/roles.controller.ts` | Controlador | Endpoints de roles y actualización de permisos (`@Put(':id/permisos')`). |
| `src/modules/auth/mail.service.ts` | Servicio | Servicio Nodemailer con plantilla HTML y despacho de enlaces a Gmail. |
| `src/modules/auth/auth.service.ts` | Servicio | Envío de correo sin exponer el token en la respuesta HTTP. |
| `src/scripts/seed.ts` | Script Standalone | Seeder manual independiente ejecutable con `npm run seed`. |

---

## 4. Credenciales de Prueba Precargadas

| Rol | Correo Registrado | Contraseña | Nombres |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@uagrm.edu.bo` | `Admin123*` | Administrador Central CITEF |
| **Docente** | `docente@uagrm.edu.bo` | `Docente123*` | Carlos Alberto Martinez Soliz |
| **Auxiliar** | `auxiliar@uagrm.edu.bo` | `Auxiliar123*` | Jael Nataly (Auxiliar de Laboratorio) |
| **Técnico** | `tecnico@uagrm.edu.bo` | `Tecnico123*` | Roberto Guzman (Soporte Técnico) |

---

## 5. Guía de Ejecución y Comandos

### 1. Ejecutar el Seeder de Datos Inicial (Manual):
```bash
cd /home/nataly/Projects/laboratorios/citef_backend
npm run seed
```

### 2. Iniciar el Backend (NestJS):
```bash
cd /home/nataly/Projects/laboratorios/citef_backend
npm run start:dev
```
- API REST: `http://localhost:3000/api/v1`
- Swagger UI interactivo: `http://localhost:3000/api/docs`

### 3. Iniciar el Frontend (Angular):
```bash
cd /home/nataly/Projects/laboratorios/citef_frontend
npm start
```
- Aplicación Web: `http://localhost:4200`

### 4. Ejecutar Pruebas Unitarias del Backend:
```bash
cd /home/nataly/Projects/laboratorios/citef_backend
npm test
```
*(Todos los 9 tests pasan al 100%).*
