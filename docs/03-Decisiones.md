# SIGAE — Bitácora de decisiones

Las decisiones de arranque están en `01-Arquitectura.md` §11. Aquí van las posteriores, la más reciente arriba. Formato: fecha · decisión · por qué · quién.

## 2026-10-25 — Paso E construido: evaluaciones, objetivos e indicadores
- **Evaluaciones por ciclo** (`evaluacion.js`, `direccion-e.js`): diagnóstica, intermedia y final se programan y capturan desde Dirección. Cada una guarda `resultados = { dimensiones: {clave: 1..5}, objetivos: {objetivoId: {estado, nota}} }`. Las dimensiones salen del catálogo editable `dimension_evaluacion`; la escala 1–5 es el **nivel de apoyo** (1 con apoyo constante · 5 de forma autónoma), supuesto #8 hasta que SHADOW mande su formato. — Claude.
- **Comparativo**: tabla dimensión × evaluación con el cambio entre la primera y la última, más la valoración por objetivo (con avance · sin cambio · alcanzado · requiere atención) y «necesidades que siguen presentes» (nivel 1–2 en la última). Muestra cambios; no escribe «mejoró/empeoró». Si Dirección marca un objetivo como alcanzado en la evaluación, el objetivo cambia de estado (decisión explícita suya). — Claude.
- **Ciclos**: al abrir uno nuevo el anterior se cierra con fecha y conserva evaluaciones y objetivos (consultables en «Ciclos anteriores»); los objetivos en proceso pueden copiarse al nuevo. Nada se borra; los objetivos se marcan alcanzados o en pausa. — Claude.
- **Quién ve qué**: monitora ve evaluaciones y objetivos con `visible_monitora` (incluye observaciones); familia solo con `visible_familia` y **nunca** las observaciones profesionales ni las notas internas por objetivo (también en el PDF `pdfEvaluaciones` con `paraFamilia`). RLS ya lo imponía desde 0002. — Claude.
- **Indicadores** (pestaña de Dirección): alcance (estudiantes, familias, tutores con cuenta, monitoras, red de apoyo, escuelas, compañeros de salón y «personas alcanzadas de forma indirecta» = suma explicada en pantalla), avances por estudiante (cambio promedio, objetivos, necesidades presentes), resultados del modelo por dimensión (primera vs. última, solo quienes tienen dos), tendencias de bitácoras (últimas 4 semanas vs. 4 anteriores + series de 8 semanas) y lectura de bitácoras por familias. Bienestar del equipo solo como conteo agregado. Cada bloque enlaza a su fuente y el pie recuerda que son patrones, no conclusiones. Sin librerías de gráficas: SVG y CSS. — Claude.
- No hubo migración nueva: `ciclos`, `objetivos` y `evaluaciones` ya existían en 0002. — Claude.

## 2026-10-25 — Puesta en marcha en las cuentas de SHADOW
- Repositorio público `ShadowM-123/sigae` con GitHub Pages desde `main` (raíz redirige a `web/`). Proyecto Supabase `sigae` (ref `osqeypstmwzguvwokomc`) en la organización de SHADOW con las migraciones 0001–0004 aplicadas desde el SQL Editor y registradas en `supabase_migrations.schema_migrations`. URL y llave *publishable* en `supabase.js`. Detalle, accesos y bitácora en `docs/04-Puesta-en-marcha.md`. — Claude con Manuel.
- El rol de la cuenta de apoyo en Supabase es **Developer** (no Administrador): el plan Free cuenta los proyectos gratuitos de cada administrador en todas sus organizaciones y bloqueaba la creación. — Claude.
- `supabase/herramientas/supabase_api.py` queda para operar por Management API con un token personal guardado fuera del repo; el conector de Supabase de Claude solo ve la organización con la que se autorizó. — Claude.

## 2026-10-24 — Paso D construido: resúmenes y descargas
- **Resúmenes V1 con reglas, sin IA** (`resumen.js`): a partir de las respuestas estructuradas y los resúmenes narrativos arma cinco secciones (acontecimientos relevantes, avances, dificultades recurrentes, objetivos que requieren atención, temas de seguimiento) con métricas comparadas contra el periodo anterior. El generador **nunca lee** `bitacora_sentir_monitora`. — Claude.
- Flujo: una tarea programada (simulada en demo al entrar) crea el **borrador** de la semana y del mes pasados por estudiante; Dirección lo revisa y edita en un editor por secciones y lo **publica**; la familia solo ve lo publicado; la monitora ve borradores y publicados de su estudiante y puede generar el suyo para descargar, pero no publicar (RLS en `0004_resumenes.sql`). — Claude.
- **PDF desde el navegador** sin ventanas emergentes: el documento se arma en un `iframe` dentro de la página con botón «Imprimir o guardar como PDF» (`pdf.js`). Tres documentos: bitácora diaria, compendio semanal/mensual (resumen + cada bitácora) y resumen solo. Ninguno incluye la sección confidencial, sin importar quién descargue. — Claude.
- Guardados por `id` usan `update`, no `upsert` parcial (en Postgres un upsert con columnas NOT NULL ausentes falla). Aplica a estudiantes, tareas, eventos, familias, pagos, especialistas, citas y resúmenes. — Claude.
- Pendiente para V2: generación de PDF en servidor (sin abrir el navegador) y redacción con IA opcional del resumen. — anotado.

## 2026-10-24 — Paso C construido + identidad visual
- **Identidad visual:** Manuel entregó el logo de SHADOW (letras negras con contorno, manzana roja, «MONITORAS EDUCATIVAS» en verde, «by Halo Mental») y pidió colores de educación a la infancia, profesionales pero no corporativos. La paleta sale del logo: verde hoja como color principal (#3A8A2E / #55A83F), rojo manzana para alertas y acentos (#E23B2E), amarillo sol para el botón principal (#F6C344), fondos crema cálidos (#FFFBF4) y tipografía redondeada Nunito. Los nombres de variables CSS se conservan (`--navy` = verde principal, `--amber` = sol) para no tocar el JavaScript. — Manuel / Claude.
- El logo se carga desde `web/assets/img/logo-shadow.png` si existe; mientras tanto se usa una versión SVG aproximada (`logo-shadow.svg`). Falta colocar el PNG original. — Claude.
- Calendario único por rol con un componente compartido (`calendario.js`): Dirección ve todo; monitora, lo de su estudiante y del equipo; familia, lo de su hijo o hija. — Claude.
- Los avisos (cumpleaños 30/7/3, pagos, bitácoras faltantes, citas, evaluaciones, solicitudes) se calculan al vuelo en el frontend (`avisos.js`); en producción un cron además los manda por correo y los guarda en `notificaciones`. — Claude.
- Pagos: Dirección configura día y monto por familia y genera los próximos meses; solo Dirección registra pagos (supuesto #13). — Claude.
- Migración `0003_calendario_citas_especialistas.sql`: tablas `eventos`, `especialistas_estudiante`, `citas`, `solicitud_historial`; la familia puede crear y editar especialistas y citas de su hijo o hija (RLS). — Claude.
- Revisión fina de bitácoras: filtro por monitora y «solo con conducta», señales en la tabla (Conducta, Día difícil, Atrasada), y «Marcar revisada» admite un comentario que la monitora ve. — Claude.

## 2026-10-24 — Pasos A y B construidos
- La base falsa se mueve a `web/assets/js/demo/supabase-falso.js` (no a `.claude/`) para poder publicar la demo en GitHub Pages. — Claude.
- Las migraciones `0001_nucleo.sql` y `0002_bitacora_y_seguimiento.sql` se escriben desde ahora, aunque no se apliquen hasta el paso I: la base falsa copia exactamente su forma. — Claude.
- El borrador de la bitácora se guarda en cada paso (`paso_actual`), y «¿Cómo me sentí?» va en tabla aparte con sus propias políticas. — según arquitectura.
- Sección «Trabajo durante las clases»: el recreo del expediente se marca «No aplica» automáticamente; la opción «No aplica» solo aparece en bloques de recreo. — Claude (supuesto #4 de preguntas abiertas).

## 2026-10-24 — Arranque
- Se adopta la arquitectura v1 (`01-Arquitectura.md`) y el orden de construcción A→J. — Manuel Acosta.
- Correo transaccional: **Resend**, con cuenta a nombre de SHADOW (pendiente crearla y verificar dominio). — Manuel Acosta.
- El repositorio se construye en `BINÉ\Clientes\SHADOW — SIGAE\sigae` y se sube al GitHub de SHADOW en el paso I, con todo su historial. — Claude, con visto bueno de Manuel.
