# SIGAE — Arquitectura del sistema

**Sistema Integral de Gestión de Acompañamiento Educativo · SHADOW Monitoras Educativas**
Versión 1 · 24 de octubre de 2026 · Documento rector. Todo cambio de fondo se anota en la sección 11 (Decisiones).

> Fuente: documento «Experiencias de usuario SIGAE» (26 págs., Dirección de SHADOW) y tabla de la convocatoria (escenarios de $100,000 y $75,000 MXN).
> Qué es este documento: el mapa que siguen quien construye hoy y el Claude de SHADOW mañana. Describe **qué** hace el sistema y **cómo está armado**. No es un manual de uso.

---

## 1. Panorama en una página

SIGAE es una aplicación web con **cinco tipos de usuario** y **dos formularios públicos**, montada sobre tres servicios en cuentas de SHADOW:

| Pieza | Servicio | Qué guarda o hace |
|---|---|---|
| Frontend | **GitHub** (repositorio + GitHub Pages) | Las pantallas. HTML, CSS y JavaScript planos, sin compilación. Un `git push` publica. |
| Backend | **Supabase** | Base de datos, usuarios y contraseñas, permisos por fila, archivos (fotos, currículums, materiales), funciones de servidor y tareas programadas. |
| Correo | **Resend** | Invitaciones, agradecimientos, recordatorios, avisos. Dominio de SHADOW verificado. |

**Principio de construcción:** la demo y el producto son el mismo código. El frontend se construye desde el día uno contra una «base falsa» (`web/assets/js/demo/supabase-falso.js`) que imita a Supabase y se activa con `?demo=1`; cuando SHADOW aprueba, se llena la configuración de `web/assets/js/supabase.js` y el mismo frontend habla con su Supabase real. La base falsa vive dentro de `web/` a propósito: así la demo también puede publicarse en GitHub Pages y verse desde un celular.

**Principio de control:** la decisión siempre es de Dirección. El sistema sugiere (compatibilidad, resúmenes, alertas), nunca decide ni concluye por sí mismo. Nada se comparte con familias o especialistas sin que Dirección lo haya publicado o autorizado.

**Principio de confidencialidad:** cada quien ve solo lo suyo. La monitora ve a su estudiante asignado; la familia a su hijo o hija; el especialista al estudiante que se le autorizó. La pregunta «¿Cómo me sentí como monitora?» la ve solo Dirección y no sale en ninguna descarga.

---

## 2. Usuarios y lo que ve cada uno

| Rol | Quién | Entra a | Primera pantalla |
|---|---|---|---|
| **Dirección** | La directora de SHADOW (y asistentes que ella autorice) | Todo | Bitácoras entregadas hoy, estado de evaluaciones, pendientes, cumpleaños próximos |
| **Monitora** | Monitoras educativas activas | Su estudiante, su bitácora, Academia, materiales, sus bitácoras pasadas | **La bitácora del día**, grande y visible, más su avance en Academia |
| **Familia** | Padre, madre o tutor (uno o varios por estudiante) | Bitácora diaria de su hijo o hija, monitora asignada, próximo pago, recursos para familias, terapias y citas, solicitud de reporte | La bitácora de hoy |
| **Especialista / personal escolar** | Terapeutas, neurólogos, psicólogos, docentes, coordinación académica | Solo consulta del estudiante autorizado y sus bitácoras; solicitud de visita escolar y de reporte; estado de sus solicitudes | El estudiante autorizado |
| **Postulante** (sin cuenta) | Personas interesadas en ser monitoras | Formulario público de primera etapa; formulario de segunda etapa por enlace seguro | — |

Los especialistas se subclasifican en **terapeuta**, **especialista externo** y **personal escolar**, para administrar sus accesos por función.

### 2.1 Matriz de permisos (resumen)

V = ver · E = editar · C = crear · D = descargar · — = sin acceso · (p) = solo lo propio o autorizado

| Información | Dirección | Monitora | Familia | Especialista |
|---|---|---|---|---|
| Expediente completo del estudiante | V E C | V (p, campos autorizados) | V (p, versión familia) | V (p, solo identificación básica) |
| Bitácora diaria | V E D, marca «requiere corrección» | C E (p, hasta enviar; corrige si Dirección lo pide) | V (p, sin sección confidencial) | V (p, si está autorizado; sin descargar) |
| «¿Cómo me sentí como monitora?» | V | V E (p) | — | — |
| Fotos de la bitácora | V D | C V (p) | V (p) | — |
| Resúmenes semanales y mensuales | V C D, publica | V D (p) | V (p, publicados) | — |
| Evaluaciones y objetivos | V E C | V (p, las autorizadas) | V (p, resumen) | — |
| Academia SHADOW | Sube contenido, ve avance de todas | Cursa, ve su avance | — | — |
| Materiales para monitoras | Administra, aprueba propuestas | V D, propone | — | — |
| Recursos para familias | Administra | — | V D | — |
| Pagos | Configura y registra | — | V (p) | — |
| Terapias, especialistas y citas | V E | V (p) | V E C (p) | — |
| Solicitudes (reporte, visita) | V, cambia estado, responde | — | C V (p) | C V (p) |
| Reclutamiento | Todo | — | — | — |
| Calendario y cumpleaños | Todo | Su estudiante | — | — |
| Indicadores | V | — | — | — |

La matriz se implementa en la base de datos con **políticas de seguridad por fila (RLS)** y, para los campos confidenciales, con **tablas separadas** (ver 4.3). El frontend oculta lo que no toca, pero la protección real está en la base: aunque alguien manipule la pantalla, la base no entrega lo que no le corresponde.

---

## 3. Mapa de módulos

Numerados en el orden en que se construyen (ver sección 9).

| # | Módulo | Para quién | Qué resuelve |
|---|---|---|---|
| 0 | **Núcleo**: usuarios, roles, estudiantes, familias, monitoras, asignaciones con historial, catálogos editables | Dirección | La columna vertebral. Sin esto nada más funciona. |
| 1 | **Bitácora diaria** (14 secciones, condicional, por bloques de horario, fotos, borrador/enviada/corrección) | Monitora → Familia, Dirección, Especialista | El corazón del sistema y lo primero que Dirección quiere ver al entrar. |
| 2 | **Panel de Dirección** y **calendario** (bitácoras de hoy, evaluaciones, pendientes, cumpleaños, recordatorios) | Dirección | Vista general del estado del proyecto. |
| 3 | **Portal de la familia** (bitácora, monitora, próximo pago, recursos, terapias y citas, solicitud de reporte) | Familia | Mantener informada a la familia desde el celular. |
| 4 | **Resúmenes semanales y mensuales** + descargas (diaria, semanal, mensual) | Dirección, Monitora, Familia | Generados desde las bitácoras; revisables antes de publicar. |
| 5 | **Evaluaciones y objetivos** (diagnóstica, intermedia, final; comparativo por ciclo) | Dirección, Monitora | Medir el avance del estudiante con criterio profesional. |
| 6 | **Indicadores e impacto** (niños, familias, monitoras, red de apoyo, tendencias de bitácoras, bienestar del equipo) | Dirección | Medir el impacto de SHADOW sin leer todas las bitácoras. |
| 7 | **Academia SHADOW** (cursos, lecciones, evaluaciones, avance, registro de accesos) | Dirección, Monitora | Capacitación continua y evidencia de avance. |
| 8 | **Materiales** (biblioteca para monitoras con bandeja de aprobación) y **Recursos para familias** | Dirección, Monitora, Familia | Dos bibliotecas, una por audiencia. |
| 9 | **Especialistas y personal escolar** (accesos por estudiante, consulta, solicitudes de visita y reporte con estados) | Especialista, Dirección | Trabajo interdisciplinario sin perder control. |
| 10 | **Reclutamiento** (página pública, dos etapas, perfiles de acompañamiento, índice de compatibilidad, entrevista, conversión a monitora) | Dirección, Postulante | Todo el proceso de selección en un solo lugar. |

---

## 4. Modelo de datos

Base PostgreSQL en Supabase, esquema `public`. Nombres en español, en minúsculas y con guion bajo. Todas las tablas llevan `id uuid`, `creado_en`, `actualizado_en`. Las columnas de abajo son las que importan para entender el modelo; las migraciones tienen el detalle.

### 4.1 Núcleo

| Tabla | Para qué | Columnas clave |
|---|---|---|
| `perfiles` | Una fila por usuario con cuenta (espejo de `auth.users`) | `id` (= auth.users.id), `rol` (direccion · asistente · monitora · familia · especialista), `subtipo_especialista` (terapeuta · externo · personal_escolar), `nombre`, `telefono`, `correo`, `fecha_nacimiento`, `foto_path`, `activo` |
| `estudiantes` | Expediente del estudiante | `nombre`, `fecha_nacimiento`, `foto_path`, `foto_autorizada`, `escuela`, `grado`, `grupo`, `direccion_escuela`, `zona`, `hora_entrada`, `hora_salida`, `dias_asistencia`, `diagnostico`, `perfil_desarrollo`, `necesidades_apoyo[]`, `dinamica_familiar`, `companeros_salon` (int), `familia_id`, `activo`, `fecha_inicio_servicio` |
| `familias` | Agrupa a los tutores de un estudiante | `nombre_familia`, `dia_de_pago` (1–31), `monto_mensual`, `notas` |
| `familia_tutores` | Qué usuarios pertenecen a qué familia | `familia_id`, `perfil_id`, `parentesco` |
| `monitoras` | Datos profesionales de la monitora (extiende `perfiles`) | `perfil_id` (PK), `formacion`, `tiene_titulo`, `tiene_cedula`, `cedula`, `experiencia`, `especialidades[]`, `zonas[]`, `disponibilidad` (jsonb por día y rango), `fecha_ingreso`, `postulacion_id`, `estado` (activa · inactiva) |
| `asignaciones` | Historial de qué monitora acompaña a qué estudiante | `estudiante_id`, `monitora_id`, `fecha_inicio`, `fecha_fin`, `motivo_cambio`, `activa`. Regla: una sola activa por estudiante. Al cambiar, la anterior se cierra con fecha y **conserva** sus bitácoras, evaluaciones y reportes. |
| `catalogos` | Listas editables desde Dirección | `tipo` (ver abajo), `clave`, `etiqueta`, `orden`, `activo` |
| `accesos_sesion` | Registro de entradas (para «cuántas veces han entrado» y «si la familia ha leído») | `perfil_id`, `fecha_hora`, `dispositivo` |

**Catálogos editables** (tipo → opciones iniciales): `lonche` (sí comió · no comió · dejó una parte) · `uso_bano` (a definir por SHADOW) · `conducta` (no se presentaron · autoagresión · agresión a otras personas · agresión con objetos) · `actividades_realizadas` (todas · la mayoría · casi ninguna · ninguna) · `participacion` (en todas · en algunas · en ninguna) · `estado_animo_estudiante` (contento · enojado · triste · cansado · irritado · aburrido · indiferente · otro) · `sentir_monitora` (cómoda · activa · contenta · incómoda · con ánimo bajo · triste · enojada · cansada · otra) · `valor_bloque` (a definir) · `formacion_academica` (educación especial · educación · técnico en puericultura · psicología general · psicología clínica · psicología educativa · fisioterapia · medicina · trabajo social · otra) · `como_se_entero` · `dimension_evaluacion` (a definir) · `especialidad` · `tipo_material`.

### 4.2 Bitácora diaria

| Tabla | Para qué | Columnas clave |
|---|---|---|
| `bitacoras` | Una por estudiante y jornada | `estudiante_id`, `monitora_id`, `asignacion_id`, `fecha_jornada`, `enviada_en`, `estado` (borrador · enviada · requiere_correccion · corregida), `valoracion_dia` (1–5), `tareas_pendientes`, `lonche`, `conductas[]`, `conducta_detalle` (jsonb: antes · qué hizo · después · respuesta de la monitora), `habilidades_sociales` (bool), `habilidades_detalle`, `actividades_realizadas`, `participacion`, `estados_animo[]`, `estado_animo_otro`, `resumen_narrativo`, `comentarios_adicionales`, `revisada_por`, `revisada_en`, `observacion_direccion`. Única por (`estudiante_id`, `fecha_jornada`). |
| `bitacora_banos` | Cada ida al baño | `bitacora_id`, `hora_aprox`, `que_hizo` (catálogo), `nota` |
| `bitacora_bloques` | Trabajo en clase por periodo de 30 min | `bitacora_id`, `hora_inicio`, `hora_fin`, `valor` (catálogo), `nota`. Los bloques se generan desde `hora_entrada`/`hora_salida` del estudiante al abrir la bitácora. |
| `bitacora_fotos` | Evidencias | `bitacora_id`, `storage_path`, `descripcion`, `subida_por` |
| `bitacora_sentir_monitora` | **Confidencial.** Sección M | `bitacora_id` (PK), `sentimientos[]`, `otro`, `comentario`. RLS: la monitora dueña y Dirección. Nunca entra en descargas ni en vistas de familia o especialista. |
| `bitacora_lecturas` | Quién leyó qué bitácora y cuándo | `bitacora_id`, `perfil_id`, `leida_en` |

El borrador se guarda automáticamente (cada cambio escribe en `bitacoras` con `estado = borrador`), así no se pierde si la monitora interrumpe. Al enviar se fija `enviada_en`; la fecha real de la jornada vive en `fecha_jornada`, por eso una bitácora atrasada conserva ambas.

### 4.3 Seguimiento del estudiante

| Tabla | Para qué | Columnas clave |
|---|---|---|
| `ciclos` | Periodo de acompañamiento (normalmente ciclo escolar) | `estudiante_id`, `nombre`, `fecha_inicio`, `fecha_fin`, `activo` |
| `objetivos` | Objetivos de acompañamiento y estrategias | `estudiante_id`, `ciclo_id`, `descripcion`, `estrategia`, `estado` (en_proceso · alcanzado · pausado), `prioridad`, `visible_monitora`, `visible_familia` |
| `evaluaciones` | Diagnóstica, intermedia y final | `estudiante_id`, `ciclo_id`, `tipo`, `fecha`, `realizada`, `aplicada_por`, `resultados` (jsonb `{ dimensiones: {clave: 1..5}, objetivos: {objetivoId: {estado, nota}} }`), `observaciones` (nunca a la familia), `archivo_path`, `visible_monitora`, `visible_familia` |
| `resumenes` | Semanal y mensual | `estudiante_id`, `tipo`, `periodo_inicio`, `periodo_fin`, `contenido` (jsonb: relevantes · avances · dificultades recurrentes · objetivos que piden atención · temas de seguimiento), `generado_automaticamente`, `revisado_por`, `estado` (borrador · publicado), `pdf_path` |
| `pagos` | Calendario de pagos de cada familia | `familia_id`, `fecha_vencimiento`, `monto`, `estado` (pendiente · pagado · vencido), `pagado_en`, `nota` |
| `especialistas_estudiante` | Red de apoyo del estudiante (con o sin cuenta en SIGAE) | `estudiante_id`, `nombre`, `especialidad`, `tipo` (terapeuta · externo · personal_escolar), `contacto`, `dias_horarios`, `perfil_id` (si tiene cuenta), `registrado_por` |
| `citas` | Próximas citas con especialistas | `estudiante_id`, `especialista_estudiante_id`, `fecha`, `hora`, `lugar_modalidad`, `observaciones`, `creada_por` |
| `accesos_especialista` | Autorización de un especialista a un estudiante | `perfil_id`, `estudiante_id`, `puede_ver_bitacoras`, `otorgado_por`, `fecha_inicio`, `fecha_fin` |
| `solicitudes` | Reporte (familia o especialista) y visita escolar | `tipo` (reporte_familia · reporte_especialista · visita_escolar), `estudiante_id`, `solicitante_id`, `datos` (jsonb con los campos del formulario según tipo), `estado` (recibida · en_revision · info_adicional · aprobada_en_proceso · atendida · no_autorizada), `respuesta_direccion`, `archivo_path` (el reporte entregado) |
| `solicitud_historial` | Cada cambio de estado | `solicitud_id`, `estado`, `por`, `nota`, `fecha` |
| `tareas` | Pendientes manuales de Dirección | `titulo`, `tipo`, `fecha`, `estudiante_id`, `estado`, `notas` |
| `eventos` | Calendario manual (visitas, reuniones, entrevistas) | `tipo`, `titulo`, `fecha_hora`, `relacion` (estudiante, monitora o postulación), `notas` |
| `notificaciones` | Avisos dentro de la app | `perfil_id`, `tipo`, `titulo`, `cuerpo`, `fecha`, `leida_en`, `enlace` |

Los **cumpleaños** no son una tabla: se calculan desde `fecha_nacimiento` de estudiantes y monitoras. Una tarea programada diaria crea las notificaciones a 30, 7 y 3 días.

### 4.4 Formación y materiales

| Tabla | Columnas clave |
|---|---|
| `cursos` | `titulo`, `descripcion`, `orden`, `obligatorio`, `publicado` |
| `lecciones` | `curso_id`, `titulo`, `tipo` (video · documento · enlace), `url` o `storage_path`, `duracion_min`, `orden` |
| `cuestionarios` | `curso_id`, `preguntas` (jsonb: texto, opciones, correcta), `minimo_aprobatorio` |
| `progreso_lecciones` | `perfil_id`, `leccion_id`, `completada_en`, `veces_vista` |
| `intentos_cuestionario` | `perfil_id`, `cuestionario_id`, `respuestas`, `puntaje`, `aprobado`, `fecha` |
| `categorias_material` | `nombre`, `padre_id`, `audiencia` (monitoras · familias), `orden` |
| `materiales` | `categoria_id`, `titulo`, `descripcion`, `tipo`, `storage_path` o `url`, `audiencia`, `estado` (propuesto · aprobado · retirado), `subido_por`, `aprobado_por`, `aprobado_en` |

### 4.5 Reclutamiento

| Tabla | Columnas clave |
|---|---|
| `perfiles_acompanamiento` | `estudiante_id`, `formacion_requerida[]`, `formacion_deseable[]`, `experiencia`, `necesidades[]`, `habilidades[]`, `conocimientos[]`, `caracteristicas`, `rango_edad`, `zona`, `direccion_escuela`, `horario`, `dias`, `otros_requisitos`, `pesos` (jsonb: peso de cada criterio), `activo` |
| `postulaciones` | `folio` (único, legible), `nombre_original`, `nombre_normalizado`, `correo` (único por proceso), `telefono`, `cv_path`, `como_se_entero`, `etapa` (recibida · invitada_2a_etapa · 2a_etapa_completa · invitada_entrevista · entrevista_agendada · entrevistada · seleccionada · cerrada), `perfil_acompanamiento_id`, `compatibilidad` (jsonb: porcentaje y desglose por criterio), `token_2a_etapa`, `motivo_cierre` |
| `postulacion_detalle` | `postulacion_id` (PK), `edad`, `fecha_nacimiento`, `calle_numero`, `colonia`, `cp`, `ciudad`, `formacion`, `formacion_otra`, `tiene_titulo`, `tiene_cedula`, `cedula`, `intereses`, `trabaja_actualmente`, `horario_actual`, `disponibilidad` (jsonb), `expectativa_economica`, `sabe_que_es_monitora`, `por_que_candidata` |
| `referencias` | `postulacion_id`, `centro_trabajo`, `nombre`, `cargo`, `contacto` |
| `postulacion_historial` | `postulacion_id`, `evento`, `fecha`, `por`, `detalle` |
| `correos_enviados` | `destinatario`, `plantilla`, `asunto`, `relacion` (postulación, familia, etc.), `resend_id`, `estado`, `fecha` |

Identidad: la postulación se identifica por `id` y `folio`, nunca por nombre. `nombre_normalizado` (sin acentos, minúsculas) sirve solo para buscar. Al avanzar de etapa se **actualiza la misma fila**; nunca se crea otra. Al seleccionar, una función de servidor crea el usuario, la fila en `perfiles` y en `monitoras` **copiando** desde la postulación, y deja `monitoras.postulacion_id` apuntando al origen.

### 4.6 Archivos (Storage)

| Bucket | Contenido | Acceso |
|---|---|---|
| `fotos-bitacoras` | Evidencias de la jornada | Privado. Monitora dueña, familia del estudiante, Dirección. Por URL firmada de corta duración. |
| `fotos-perfil` | Fotos de estudiantes y monitoras | Privado, mismas reglas que el expediente. |
| `curriculums` | CV de postulantes | Privado. Solo Dirección. La subida pública pasa por una función de servidor. |
| `materiales` | Biblioteca de monitoras y recursos para familias | Privado. Descarga con URL firmada según audiencia y estado aprobado. |
| `reportes` | PDF de resúmenes y reportes entregados | Privado. Dirección y el destinatario autorizado. |
| `academia` | Documentos de las lecciones | Privado, monitoras y Dirección. **Los videos no se guardan aquí:** se suben a YouTube (no listado) o Vimeo y SIGAE guarda el enlace. Guardar video en Supabase sale caro y lento. |

---

## 5. Flujos principales

### 5.1 La jornada de una monitora
1. Entra desde el celular. Ve en grande «Bitácora de hoy: Santiago» y debajo su avance en Academia y pendientes.
2. Abre la bitácora. La fecha viene puesta (puede cambiarla si es atrasada). Los bloques de 30 min ya están generados según el horario del estudiante.
3. Contesta por botones; los campos de texto aparecen solo cuando hace falta (una conducta marcada abre el detalle antes-durante-después-respuesta).
4. Cada respuesta se guarda como borrador. Puede cerrar y volver.
5. Al final: resumen narrativo, «¿Cómo me sentí?» (confidencial), comentarios, fotos. Revisa y envía. Queda `enviada_en`.
6. La familia la ve de inmediato (sin la sección confidencial). Dirección la ve como entregada en su panel. Si Dirección marca «requiere corrección», la monitora recibe aviso y la corrige; queda historial.

### 5.2 El día de Dirección
1. Entra y ve: bitácoras de hoy entregadas y faltantes por estudiante y monitora; estado de evaluaciones por estudiante (diagnóstica, intermedia, final: hecha, programada, vencida); pendientes (solicitudes nuevas, bitácoras por revisar, visitas, tareas); cumpleaños próximos.
2. Desde cualquier pendiente llega al detalle con un clic.
3. En Monitoras ve el avance en Academia, accesos, resultados de exámenes y, en el perfil de cada una, la serie de «¿Cómo me sentí?» con tendencias (por ejemplo «cansada» 4 de las últimas 6 jornadas).

### 5.3 Semana y mes
Una tarea programada genera el **borrador** del resumen semanal (lunes) y mensual (día 1) por estudiante, a partir de las respuestas estructuradas y los resúmenes narrativos. Dirección (o la monitora, según permiso) lo revisa, ajusta y publica. La familia ve solo lo publicado. La descarga (PDF) compila las bitácoras del periodo más el resumen, **sin** la sección confidencial.

### 5.4 Solicitudes
Familia o especialista pulsa «Solicitar reporte» o «Solicitar visita escolar» → llena el formulario de su tipo → aparece como pendiente en Dirección con estado «recibida» → Dirección cambia el estado y, si procede, adjunta el reporte → el solicitante ve el estado sin volver a pedir. Ningún reporte se genera ni se comparte solo.

### 5.5 Reclutamiento
Postulación pública (sin cuenta, con CV) → confirmación por correo → aparece en el panel → Dirección la compara con un perfil de acompañamiento (porcentaje con desglose) → **Avanzar** (correo con enlace seguro a la segunda etapa) o **Cerrar** (correo cordial) → segunda etapa completa la misma postulación → **Avanzar a entrevista** (correo con enlace de agenda) o **Cerrar** → entrevista registrada → **Seleccionar** crea el usuario de monitora copiando todo → asignación al estudiante con compatibilidad visible.

### 5.6 Cambio de monitora
Dirección cierra la asignación activa (fecha y motivo) y abre la nueva. La monitora anterior pierde acceso al expediente al instante (la política RLS mira `asignaciones.activa`); sus bitácoras, evaluaciones y reportes quedan intactos y atribuidos a ella.

---

## 6. Funciones de servidor y tareas programadas

Edge Functions de Supabase (Deno/TypeScript). El frontend nunca guarda llaves secretas.

| Función | Disparo | Qué hace |
|---|---|---|
| `enviar-correo` | Llamada interna | Envía por Resend con plantillas: postulación recibida · invitación a 2ª etapa · agradecimiento · invitación a entrevista · recordatorio de bitácora · recordatorio de pago · aviso de cumpleaños · bitácora requiere corrección · solicitud recibida / cambio de estado. Registra en `correos_enviados`. |
| `postulacion-publica` | Formulario público | Valida, guarda el CV en `curriculums`, crea la postulación, dispara el correo de confirmación. Con límite de envíos por IP. |
| `segunda-etapa` | Enlace con token | Entrega y recibe el formulario de segunda etapa de **esa** postulación. |
| `calcular-compatibilidad` | Al elegir perfil de acompañamiento | Compara postulación contra perfil con los pesos definidos; devuelve porcentaje y desglose. V1 con reglas sobre datos estructurados (formación, experiencia, necesidades, disponibilidad vs. horario, zona). V2 opcional con IA leyendo el CV. |
| `generar-resumen` | Cron lunes y día 1; o botón | Arma el borrador del resumen semanal/mensual. V1 con reglas (frecuencias, cambios, objetivos tocados); V2 opcional con IA para la redacción. |
| `recordatorios-diarios` | Cron 7:00 | Cumpleaños (30/7/3 días), pagos próximos y vencidos, bitácoras no entregadas al cierre de la jornada, citas de mañana. Crea notificaciones y, si aplica, correos. |
| `seleccionar-monitora` | Botón en Dirección | Crea el usuario (invitación por correo), `perfiles` y `monitoras` desde la postulación. |
| `crear-usuario` | Botón en Dirección | Alta de familias, especialistas y asistentes con invitación por correo. |

**PDF:** en la versión 1 los documentos (bitácora diaria, compendio semanal/mensual con su resumen, resumen solo) se arman en el navegador dentro de una vista de impresión (`pdf.js`, sin ventanas emergentes) y se guardan como PDF desde ahí; evita servidores de PDF. Ningún documento incluye la sección confidencial de la monitora. Si hace falta generación automática sin abrir el navegador, se añade después como función.

**Agenda de entrevistas:** SIGAE guarda el enlace de la página de citas de Dirección (Google Calendar «Citas» o similar) y lo manda en el correo; al confirmarse, Dirección registra la entrevista en SIGAE. Integración automática con el calendario: fase posterior.

---

## 7. Frontend

- **Sin frameworks ni compilación.** HTML + CSS + JavaScript modular (`type="module"`), cliente oficial de Supabase por CDN. Igual que bine.com.mx. El Claude de SHADOW edita archivos y hace `git push`; no hay `npm install` ni builds que se rompan.
- **Una página por rol**, cada una con sus pestañas: `index.html` (entrada y redirección por rol), `direccion.html`, `monitora.html`, `familia.html`, `especialista.html`, `postulacion.html` (pública), `segunda-etapa.html` (pública por token).
- **Mobile first** en monitora y familia: botones grandes, una pregunta a la vez en la bitácora, guardado automático, funciona con conexión intermitente (el borrador se guarda local y se sincroniza).
- **Módulos JS** por dominio: `supabase.js` (conexión y configuración), `auth.js`, `bitacora.js`, `expediente.js`, `academia.js`, `materiales.js`, `solicitudes.js`, `reclutamiento.js`, `indicadores.js`, `pdf.js`, `ui.js`.
- **Base falsa** en `web/assets/js/demo/supabase-falso.js`: implementa las mismas llamadas del cliente de Supabase que usa el frontend (consultas, auth, storage, rpc) con datos de muestra persistidos en el navegador. Se activa con `?demo=1`. Las fechas de la muestra se calculan respecto al día real, así la demo siempre luce actual.
- Identidad visual: derivada del logo de SHADOW (manzana roja, hoja verde, letras negras): verde como color principal, rojo para alertas, amarillo sol para la acción principal, fondos crema y tipografía redondeada (Nunito). Profesional pero dirigida a las infancias. Logo en `web/assets/img/`.

---

## 8. Repositorio y despliegue

```
sigae/
├── CLAUDE.md                 ← instrucciones para el Claude de SHADOW
├── README.md                 ← cómo correr, publicar y dónde está cada cosa
├── docs/
│   ├── 01-Arquitectura.md    ← este documento
│   ├── 02-Preguntas-abiertas.md
│   └── 03-Decisiones.md      ← bitácora de decisiones (se abre al arrancar la construcción)
├── web/                      ← lo que publica GitHub Pages
│   ├── index.html, direccion.html, monitora.html, familia.html, especialista.html
│   ├── postulacion.html, segunda-etapa.html
│   └── assets/css, assets/js
├── supabase/
│   ├── migrations/           ← esquema, RLS, catálogos iniciales (numeradas, nunca se editan las aplicadas)
│   ├── functions/            ← Edge Functions
│   └── seed/                 ← datos de muestra para pruebas
└── .claude/                  ← páginas de prueba locales (la base falsa está en web/assets/js/demo/)
```

- **Publicación:** GitHub Pages sirviendo la carpeta `web/` de la rama `main`. Cada `push` publica en 1–2 minutos. Dominio propio opcional (`app.shadow…`) apuntado a Pages.
- **Base:** proyecto Supabase en la organización de SHADOW. Las migraciones se aplican con la CLI de Supabase o desde el conector de Claude; el historial queda en `supabase/migrations/`.
- **Secretos:** solo en Supabase (llave de Resend, llave de servicio). En el repo únicamente la URL del proyecto y la llave pública (anon), que están diseñadas para ser públicas porque la seguridad la ponen las políticas RLS.
- **Cuentas necesarias a nombre de SHADOW:** GitHub, Supabase, Resend (con el dominio de correo verificado). Nada más.

---

## 9. Orden de construcción

Cada paso termina con algo que se puede ver y probar. Las fases 2 a 4 de la ruta acordada con Manuel se reparten así:

| Paso | Entrega | Módulos |
|---|---|---|
| A | Núcleo + pantalla de entrada por rol, con base falsa | 0 |
| B | Bitácora completa en celular + lectura por la familia + panel de Dirección con «bitácoras de hoy» | 1, 2 (parte), 3 (parte) |
| C | Calendario, cumpleaños, pagos, pendientes, revisión de bitácoras | 2, 3 |
| D | Resúmenes y descargas | 4 |
| E | Evaluaciones, objetivos, indicadores | 5, 6 |
| F | Academia y materiales / recursos | 7, 8 |
| G | Especialistas y solicitudes | 9 |
| H | Reclutamiento completo | 10 |
| I | **Conexión a Supabase real**: migraciones, RLS, storage, funciones, Resend, usuarios iniciales | — |
| J | Carga de datos reales, piloto con una monitora y una familia, entrega y guía para su Claude | — |

La demo para SHADOW se presenta al terminar B (ya se ve el corazón) y de nuevo al terminar H. El paso I no empieza hasta que SHADOW apruebe las pantallas.

---

## 10. Lo que el sistema NO hace (por diseño)

- No decide contrataciones: el porcentaje de compatibilidad es apoyo, y los pesos los ajusta Dirección por perfil.
- No concluye que un estudiante «mejoró» o «empeoró» por una respuesta aislada; los indicadores muestran patrones y enlazan a la fuente.
- No genera reportes clínicos ni diagnósticos; genera peticiones que Dirección prepara y autoriza.
- No muestra a familias ni especialistas la sección «¿Cómo me sentí como monitora?» ni la incluye en ninguna descarga.
- No permite a especialistas editar ni descargar.
- No sustituye la atención directa ni la coordinación profesional de SHADOW.

---

## 11. Decisiones tomadas (24-oct-2026)

| # | Decisión | Por qué |
|---|---|---|
| 1 | Frontend plano (HTML/JS) + Supabase + GitHub Pages | Mantenible por el Claude de SHADOW sin herramientas de compilación; mismo stack probado en bine.com.mx. |
| 2 | Correo transaccional con **Resend**, cuenta a nombre de SHADOW | Entregabilidad, plantillas, registro de envíos; ya lo opera Biné. |
| 3 | Demo y producto comparten código; la demo corre con base falsa | Cero retrabajo al pasar a producción. |
| 4 | Sección «¿Cómo me sentí?» en tabla aparte con RLS propia | La confidencialidad se garantiza en la base, no solo en pantalla. |
| 5 | Asignaciones con historial, nunca sobreescritura | Trazabilidad al cambiar de monitora; la anterior pierde acceso sin perder su trabajo. |
| 6 | Catálogos editables para toda lista de opciones | SHADOW ajusta opciones (baño, bloques, formación…) sin tocar código. |
| 7 | Videos de la Academia en YouTube no listado / Vimeo, no en Storage | Costo y velocidad. |
| 8 | Compatibilidad y resúmenes: V1 con reglas, IA opcional después | Funciona sin llave de IA ni costo por uso; la IA se enchufa cuando SHADOW lo decida. |
| 9 | PDF desde el navegador en V1 | Sin servidor de PDF; suficiente para bitácoras y compendios. |
| 10 | Entrevistas por enlace de agenda externo en V1 | Evita integrar OAuth de Google desde el inicio. |
| 11 | Repositorio dentro de `Clientes\SHADOW — SIGAE\sigae` mientras se construye; se sube al GitHub de SHADOW en el paso I | Manuel lo tiene a la mano; el historial de git viaja completo. |
| 12 | La base falsa vive en `web/assets/js/demo/` y no en `.claude/` | Para poder publicar la demo en GitHub Pages y enseñarla desde el celular de la directora. |
| 13 | Capa `api.js` sin «embeds» de PostgREST: las uniones se hacen en JavaScript | La base falsa y la real se comportan igual; el código es más fácil de leer para el Claude de SHADOW. |
