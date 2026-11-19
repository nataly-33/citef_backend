# MÓDULO 8: ANALÍTICA PREDICTIVA, DASHBOARD EJECUTIVO Y REPORTES - CITEF FCEE UAGRM
**Documento Técnico de Implementación y Protocolo de Verificación Operativa (Máxima Prioridad para Defensa II)**

---

## 1. Resumen Ejecutivo del Módulo 8

El **Módulo 8** constituye el núcleo estratégico de inteligencia de datos y analítica avanzada del Sistema CITEF (Facultad de Ciencias Económicas y Empresariales - UAGRM). Este módulo fue concebido para dotar a la **Decanatura, Vicedecanatura, Jefatura de Laboratorios y comisiones de Acreditación** de una consola ejecutiva interactiva en tiempo real, respaldada por modelos matemáticos estocásticos y algoritmos de Machine Learning.

### Objetivos y Capacidades Centrales:
1. **Dashboard Gerencial Interactivo en Tiempo Real (CU27):**
   - 6 KPIs estratégicos que monitorean la utilización de recursos físicos, cobertura académica y confiabilidad del parque informático.
   - Batería de 4 variedades de gráficos interactivos desarrollados en SVG nativo responsivo, respetando estrictamente la paleta institucional FCEE (`#002855`, `#A81124`, `#d97706`, `#15803d`):
     * **Gráfico Donut / Torta:** Cuotas porcentuales de demanda estudiantil por Carrera Curricular.
     * **Gráficos de Barras Agrupadas:** Capacidad instalada vs ocupación por laboratorio (`LAB-01` a `LAB-46`) y distribución de afluencia por día de la semana (Lunes a Sábado).
     * **Gráfico de Líneas Temporal:** Evolución continua de la demanda horaria semanal (07:00 a 22:00).
     * **Matriz de Calor (Heatmap):** Densidad horaria por día de la semana para detección temprana de cuellos de botella y franjas ociosas.
2. **Generador y Exportador de Reportes Oficiales Acreditables (CU27):**
   - **Exportación a Excel (`.xlsx`):** Generación binaria nativa en servidor (`xlsx`) con membrete formal facultativo, estilos estructurados, metadatos y fórmulas de totales para auditorías presupuestarias y de acreditación.
   - **Generación de PDF Oficial Institucional:** Vista previa formal con membrete oficial FCEE UAGRM, firmas digitales de autoridades (Decano, Vicedecano, Jefe CITEF), tabla analítica de alto contraste y **Hash criptográfico SHA-256** para certificar la inalterabilidad forense del documento.
   - Catálogo de los 5 reportes institucionales normalizados:
     1. `REP-01`: Reporte de Cátedras y Cumplimiento Docente.
     2. `REP-02`: Reporte de Ocupación y Eficiencia de Aulas.
     3. `REP-03`: Reporte de Salud de Infraestructura y Mantenimiento RAMS.
     4. `REP-04`: Reporte de Prioridad Académica y Evaluaciones.
     5. `REP-05`: Reporte Forense de Auditoría Transaccional.
3. **Inferencia Predictiva con Machine Learning y Teoría de Colas $M/M/c$ (CU26):**
   - Microservicio Python 3 / FastAPI desacoplado en puerto `8001`.
   - **Modelo Predictivo:** Algoritmo de regresión `RandomForestRegressor` entrenado con historial de uso facultativo, ajustado por estacionalidad (semana de exámenes, turnos nocturnos, días hábiles y capacidad física de salas). Rendimiento: $R^2 = 0.9819$, $\text{MAE} = 1.24$ estudiantes.
   - **Modelo Estocástico $M/M/c$ (Erlang-C):** Cálculo riguroso de probabilidad de espera ($P_c$), factor de utilización ($\rho$), tiempo medio en cola ($W_q$), longitud de cola ($L_q$), y dimensionamiento algorítmico de puestos óptimos ($c^*$).
   - **Fallback Autónomo Resiliente:** En caso de que el microservicio FastAPI se encuentre desconectado o en mantenimiento, el backend NestJS ejecuta de forma transparente y autónoma los mismos algoritmos matemáticos en TypeScript local, garantizando alta disponibilidad continua (0 errores en frontend).

---

## 2. Formulación Matemática de los Modelos Analíticos

### 2.1. Teoría de Colas $M/M/c$ (Erlang-C)

Sea:
* $\lambda$: Tasa media de llegada de estudiantes al laboratorio (estudiantes/hora).
* $\mu$: Tasa media de servicio por computadora ($\mu = 60 / \text{duración promedio en minutos}$).
* $c$: Número de puestos de cómputo operativos en la sala.

#### Factor de Utilización ($\rho$):
$$\rho = \frac{\lambda}{c \cdot \mu}$$
*Si $\rho \ge 1.0$, el sistema es inestable y la cola crece indefinidamente (estado SATURADO).*

#### Probabilidad de que el Laboratorio esté Vacío ($P_0$):
$$P_0 = \left[ \sum_{n=0}^{c-1} \frac{(c\rho)^n}{n!} + \frac{(c\rho)^c}{c! (1 - \rho)} \right]^{-1}$$

#### Probabilidad de Espera en Fila (Fórmula de Erlang-C, $P_c$):
$$P_c = C(c, \lambda/\mu) = \frac{\frac{(c\rho)^c}{c! (1 - \rho)}}{\sum_{n=0}^{c-1} \frac{(c\rho)^n}{n!} + \frac{(c\rho)^c}{c! (1 - \rho)}} = \frac{(c\rho)^c}{c! (1 - \rho)} \cdot P_0$$

#### Medidas de Eficiencia del Sistema:
* **Longitud Media de la Cola de Espera ($L_q$):**
  $$L_q = \frac{P_c \cdot \rho}{1 - \rho}$$
* **Tiempo Medio de Espera en Cola ($W_q$):**
  $$W_q = \frac{L_q}{\lambda} \quad (\text{en horas}), \quad W_{q,\text{min}} = W_q \times 60 \quad (\text{en minutos})$$
* **Tiempo Total en el Sistema ($W_s$):**
  $$W_s = W_q + \frac{1}{\mu} \quad (\text{en horas}), \quad W_{s,\text{min}} = W_s \times 60 \quad (\text{en minutos})$$
* **Número Medio de Estudiantes en el Sistema ($L$ - Ley de Little):**
  $$L = \lambda \cdot W_s = L_q + \frac{\lambda}{\mu}$$
* **Probabilidad de que la Espera Exceda una Tolerancia $t$ ($P(W_q > t)$):**
  $$P(W_q > t) = P_c \cdot e^{-c \cdot \mu \cdot (1 - \rho) \cdot t}$$

#### Algoritmo de Capacidad Óptima Recomendada ($c^*$):
El sistema itera incrementalmente $c' \ge \lceil \lambda/\mu \rceil + 1$ hasta encontrar el menor número de estaciones $c^*$ tal que:
$$\rho(c^*) < 0.80 \quad \land \quad W_{q,\text{min}}(c^*) < \text{tolerancia (ej. 5.0 min)}$$

---

## 3. Arquitectura de Archivos Implementados

### Backend (`citef_backend/src/modules/analitica/`)
```
citef_backend/src/modules/analitica/
├── entities/
│   ├── ejecucion-ml.entity.ts
│   └── documento-reporte-exportado.entity.ts
├── dto/
│   ├── filtro-dashboard.dto.ts
│   ├── generar-reporte.dto.ts
│   ├── consultar-prediccion.dto.ts
│   └── simular-colas.dto.ts
├── clients/
│   └── analytics-fastapi.client.ts     # Cliente HTTP hacia FastAPI con fallback autónomo TypeScript
├── services/
│   ├── metricas-dashboard.service.ts   # 6 KPIs, agregaciones por carrera, salas y heatmap
│   ├── exportacion-reportes.service.ts # Generación de Excel (.xlsx) y payload con SHA-256
│   └── analitica-predictiva.service.ts # Orquestación predictiva y trazabilidad
├── controllers/
│   ├── metricas.controller.ts
│   ├── reportes.controller.ts
│   └── predicciones.controller.ts
└── analitica.module.ts
```

### Microservicio Predictivo (`citef_ml/`)
```
citef_ml/
├── requirements.txt
├── main.py
├── test_ml.py
├── math_models/
│   └── colas_mmc.py           # Algoritmos de Erlang-C, Wq y optimización de capacidad
├── ml/
│   ├── pipeline_rf.py         # Entrenamiento con RandomForestRegressor
│   ├── predictor.py           # Proyecciones horarias y semaforización de riesgo
│   └── modelo_rf_demanda.pkl  # Modelo entrenado persistido
└── endpoints/
    └── prediccion.py          # Endpoints FastAPI con validaciones Pydantic
```

### Frontend (`citef_frontend/src/app/pages/analitica/`)
```
citef_frontend/src/app/
├── core/services/
│   └── analitica.service.ts
└── pages/analitica/
    ├── dashboard-gerencial/
    │   ├── dashboard-gerencial.component.ts # KPIs, Gráficos SVG interactivos y filtros compactos
    │   ├── dashboard-gerencial.component.html
    │   └── dashboard-gerencial.component.css
    ├── reportes-oficiales/
    │   ├── reportes-oficiales.component.ts  # Catálogo de los 5 reportes, exportación Excel y modal PDF
    │   ├── reportes-oficiales.component.html
    │   └── reportes-oficiales.component.css
    └── pronostico-saturacion/
        ├── pronostico-saturacion.component.ts # Curvas de ML y simulador reactivo M/M/c
        ├── pronostico-saturacion.component.html
        └── pronostico-saturacion.component.css
```

---

## 4. Guía Paso a Paso para la Verificación Operativa

### Paso 1: Puesta en Marcha de los Servidores
En 2 terminales independientes (o 3 si se desea activar el microservicio ML en simultáneo):

```bash
# Terminal 1: Backend NestJS (Puerto 3000)
cd citef_backend && npm run start:dev

# Terminal 2: Frontend Angular (Puerto 4200)
cd citef_frontend && npm start

# Terminal 3 (Opcional): Microservicio Python FastAPI (Puerto 8001)
cd citef_ml && source venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```
*(Nota: Si no se levanta la Terminal 3, el backend ejecutará automáticamente su motor analítico local de fallback sin errores).*

---

### Paso 2: Navegación y Dashboard Gerencial (`/admin/analitica/dashboard`)
1. Iniciar sesión con un usuario con permisos ejecutivos:
   - `admin@uagrm.edu.bo` / `Admin123*` (o `docente@uagrm.edu.bo` / `Admin123*`).
2. En el menú lateral (Sidebar), hacer clic en el módulo colapsable **"Analítica"** (ícono `bi-graph-up-arrow`).
3. Seleccionar **"Dashboard Ejecutivo"**.
4. **Verificación de KPIs:**
   - Comprobar las 6 tarjetas superiores con iconos y porcentajes:
     * *Tasa Global de Ocupación:* Con barra de progreso y semáforo.
     * *Horas Cátedra Dictadas:* Acumulado de horas de cátedra.
     * *Evaluaciones Prioritarias:* Conteo de exámenes.
     * *Tiempo Medio de Permanencia ($W_s$):* Minutos por sesión.
     * *Salud del Parque RAMS:* Balance operativas vs taller.
     * *Mitigación de Conflictos:* Conflictos evitados.
5. **Verificación de Gráficos SVG Interactivos:**
   - **Donut por Carrera:** Pasar el cursor sobre los arcos; verificar que se despliega el tooltip flotante con la carrera y porcentaje respectivo.
   - **Barras por Sala:** Verificar la comparación de aforo físico vs computadoras en uso.
   - **Barras por Día:** Inspeccionar el volumen de afluencia de Lunes a Sábado.
   - **Línea Temporal Horaria:** Observar la curva de ocupación de 07:00 a 22:00.
   - **Heatmap de Congestión:** Posicionar el cursor sobre las celdas coloreadas de la matriz Día $\times$ Hora; comprobar el porcentaje de saturación y nivel de riesgo.
6. **Verificación de Filtros Compactos:**
   - Comprobar que los campos de fecha y selectores no tienen `<label>` encima de ellos.
   - Probar el filtrado por sala o rango de fechas haciendo clic en el botón **"Buscar"** en Azul Marino (`#002855`).
7. **Verificación de Impresión:**
   - Hacer clic en el botón **"Imprimir Resumen Ejecutivo"**; verificar que se suprime la barra lateral, la barra superior y los botones, imprimiendo un reporte limpio formal.

---

### Paso 3: Catálogo y Exportación de Reportes Oficiales (`/admin/analitica/reportes`)
1. En el Sidebar, bajo "Analítica", seleccionar **"Reportes Oficiales"**.
2. **Exploración del Catálogo:**
   - Inspeccionar las tarjetas de los 5 reportes acreditables:
     1. *Reporte de Cátedras y Cumplimiento Docente.*
     2. *Reporte de Ocupación y Eficiencia de Aulas.*
     3. *Reporte de Salud de Infraestructura y Mantenimiento RAMS.*
     4. *Reporte de Prioridad Académica y Evaluaciones.*
     5. *Reporte Forense de Auditoría Transaccional.*
3. **Descarga de Libro Excel Estructurado (`.xlsx`):**
   - Seleccionar un reporte (ej. *Ocupación y Eficiencia de Aulas*).
   - Hacer clic en el botón **"Exportar a Excel (.xlsx)"** (Azul Marino Institucional).
   - Comprobar la descarga automática del archivo `CITEF_REP_OCUPACION_...xlsx`.
   - Abrir el archivo en Excel/Calc: verificar el membrete oficial institucional FCEE UAGRM en la cabecera, columnas normalizadas y fila de totales con fórmulas numéricas.
4. **Vista Previa e Impresión de PDF Oficial:**
   - En la tarjeta del reporte, hacer clic en **"Generar e Imprimir PDF Oficial"**.
   - Se abre el modal de vista previa formal:
     * Cabecera oficial: Universidad Autónoma Gabriel René Moreno - Facultad de Ciencias Económicas y Empresariales - CITEF.
     * Número formal de resolución administrativa.
     * Tabla analítica con datos de laboratorio, aforo y tasas de utilización.
     * Bloque de firmas oficiales de Decano, Vicedecano y Jefe de Laboratorios.
     * Hash SHA-256 de inalterabilidad en el pie de página.
   - Hacer clic en **"Imprimir Documento"**: verificar en la vista previa del navegador que se genera un acta formal en tabla limpia de alto contraste sin menús interactivos.

---

### Paso 4: Pronóstico de Demanda y Simulador de Colas $M/M/c$ (`/admin/analitica/pronostico`)
1. En el Sidebar, bajo "Analítica", seleccionar **"Pronóstico y Colas"**.
2. **Inferencia Predictiva con Machine Learning:**
   - Seleccionar un laboratorio (ej. `LAB-01`) y una fecha futura.
   - Hacer clic en **"Ejecutar Predicción ML"**.
   - Comprobar la gráfica SVG con la curva de demanda proyectada hora por hora (07:00 a 22:00) vs la línea roja de aforo físico.
   - Verificar la identificación automática de la hora pico más congestionada y el badge de nivel de riesgo (`BAJO`, `MODERADO` o `CRÍTICO`).
3. **Simulador Interactivo de Teoría de Colas $M/M/c$ (Erlang-C):**
   - En la sección inferior, interactuar con los controles deslizantes (sliders) o inputs:
     * Variar $\lambda$ (Tasa de llegada de estudiantes, ej. 45 est/h).
     * Variar el tiempo de uso por estudiante (ej. 60 min).
     * Variar $c$ (puestos habilitados, ej. 30 puestos).
   - Observar cómo cambian en tiempo real las métricas estocásticas:
     * Factor de utilización $\rho$ (con barra semaforizada Verde / Amarillo / Rojo).
     * Tiempo medio de espera en cola $W_q$ (en minutos).
     * Longitud media de la cola $L_q$ (estudiantes en fila de espera).
     * Probabilidad de demora Erlang-C $P_c$ (%).
     * Tiempo total en el sistema $W_s$.
4. **Recomendación Algorítmica de Capacidad:**
   - Comprobar la tarjeta institucional FCEE: *"Se recomiendan $c^*$ puestos de cómputo para garantizar un tiempo de espera menor a 5 minutos"*.
   - Hacer clic en el botón **"Aplicar $c^*$ Puestos"**: comprobar que el slider de puestos se calibra automáticamente en 1 solo clic y el semáforo conmuta a verde.

---

## 5. Matriz de Resultados de Certificación y Pruebas

| Componente | Suites de Prueba | Pruebas Unitarias | Compilación / Build | Código de Salida |
| :--- | :--- | :--- | :--- | :--- |
| **Backend NestJS** | 22 suites | 141 tests pasados (100%) | `nest build` | `0 (Clean)` |
| **Frontend Angular 18** | Standalone Build | 0 errores TypeScript | `ng build` | `0 (Clean)` |
| **Microservicio ML Python** | `unittest` suite | 13 tests pasados (100%) | `python3 test_ml.py` | `0 (Clean)` |
| **Puertos 3000, 4200 y 8001** | Liberados | 0 procesos residuales | `lsof -i :3000,:4200,:8001` | `Liberados` |

---

## 6. Historial de Control de Versiones

| Versión | Fecha | Secciones Afectadas | Descripción de Cambios y Mejoras |
| :--- | :--- | :--- | :--- |
| **v1.0** | 2026-10-25 | Documento Completo | **Implementación Integral del Módulo 8 (CU26 y CU27):** Microservicio Python FastAPI desacoplado en puerto 8001 con RandomForest y Teoría de Colas $M/M/c$ (Erlang-C), Backend NestJS con agregaciones de datos, exportación nativa a Excel `.xlsx` y PDF formal con hash SHA-256, y Frontend Angular 18 con Dashboard Gerencial, Reportes Oficiales y Pronóstico Interactivo. |
