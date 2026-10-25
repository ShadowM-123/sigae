# SIGAE — Sistema Integral de Gestión de Acompañamiento Educativo

Plataforma de **SHADOW Monitoras Educativas** para operar el acompañamiento de estudiantes en la escuela: bitácoras diarias, expedientes, evaluaciones, familias, monitoras, Academia, materiales, especialistas y reclutamiento.

## Estado
Arquitectura v1 cerrada y pasos A a H construidos (24 y 25-oct-2026): núcleo, bitácora diaria en celular, portal de la familia, panel de Dirección, calendario, pagos por familia, pendientes y solicitudes, red de apoyo, avisos, resúmenes semanales y mensuales con PDF, evaluaciones por ciclo (diagnóstica, intermedia, final) con comparativo y objetivos, indicadores de impacto, Academia SHADOW (cursos, lecciones, evaluaciones, avance), biblioteca de materiales con bandeja de aprobación, recursos para familias, portal de especialistas y personal escolar (consulta autorizada y solicitudes) y reclutamiento completo (postulación pública, segunda etapa por enlace, perfiles de acompañamiento, compatibilidad, decisiones con historial, correos y conversión en monitora). Falta la entrega (paso J): Resend, usuarios reales y guía para Dirección. Desde el 25-oct-2026 el código vive en `github.com/ShadowM-123/sigae`, la demo pública en `https://shadowm-123.github.io/sigae/?demo=1` y la base real (sin usuarios aún) en el proyecto `sigae` de Supabase de SHADOW; ver `docs/04-Puesta-en-marcha.md`.

## Documentos
- [`docs/01-Arquitectura.md`](docs/01-Arquitectura.md) — el mapa del sistema (léelo primero).
- [`docs/02-Preguntas-abiertas.md`](docs/02-Preguntas-abiertas.md) — lo que falta definir con Dirección y los supuestos vigentes.
- [`docs/03-Decisiones.md`](docs/03-Decisiones.md) — bitácora de decisiones.
- [`docs/04-Puesta-en-marcha.md`](docs/04-Puesta-en-marcha.md) — cuentas, repositorio, proyecto de Supabase, Resend y cómo se conectan.
- [`CLAUDE.md`](CLAUDE.md) — instrucciones para trabajar en este repo con Claude.

## Stack
HTML + CSS + JavaScript sin compilación · Supabase (base de datos, usuarios, archivos, funciones, cron) · GitHub Pages (publicación) · Resend (correo).

## Cómo verlo en local
Las páginas usan módulos de JavaScript, así que necesitan un servidor estático (no abren con doble clic). Desde la carpeta del repo:
```
python -m http.server 8766
```
y entra a `http://localhost:8766/web/index.html?demo=1`. Con `demo=1` las páginas usan `web/assets/js/demo/supabase-falso.js` (datos ficticios guardados en tu navegador; el botón «Reiniciar demo» los regresa al inicio).

## Cómo publicar
`git push` a `main`. GitHub Pages sirve la raíz del repositorio (`index.html` redirige a `web/`). Liga pública: `https://shadowm-123.github.io/sigae/` (demo con `?demo=1`). Cuentas, accesos y pasos de conexión: [`docs/04-Puesta-en-marcha.md`](docs/04-Puesta-en-marcha.md).

## Cómo aplicar cambios a la base
Las migraciones viven en `supabase/migrations/`, numeradas. Se aplican con la CLI de Supabase (`supabase db push`) o desde el conector de Supabase en Claude. Una migración aplicada no se edita: se escribe la siguiente.
