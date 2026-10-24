# SIGAE — Sistema Integral de Gestión de Acompañamiento Educativo

Plataforma de **SHADOW Monitoras Educativas** para operar el acompañamiento de estudiantes en la escuela: bitácoras diarias, expedientes, evaluaciones, familias, monitoras, Academia, materiales, especialistas y reclutamiento.

## Estado
Fase de arquitectura cerrada (24-oct-2026). Construcción del frontend con base falsa en curso. No está en producción.

## Documentos
- [`docs/01-Arquitectura.md`](docs/01-Arquitectura.md) — el mapa del sistema (léelo primero).
- [`docs/02-Preguntas-abiertas.md`](docs/02-Preguntas-abiertas.md) — lo que falta definir con Dirección y los supuestos vigentes.
- [`docs/03-Decisiones.md`](docs/03-Decisiones.md) — bitácora de decisiones.
- [`CLAUDE.md`](CLAUDE.md) — instrucciones para trabajar en este repo con Claude.

## Stack
HTML + CSS + JavaScript sin compilación · Supabase (base de datos, usuarios, archivos, funciones, cron) · GitHub Pages (publicación) · Resend (correo).

## Cómo verlo en local
Abre `web/index.html?demo=1` en el navegador. Con `demo=1` las páginas usan `.claude/supabase-falso.js` (datos de muestra, nada real).

## Cómo publicar
`git push` a `main`. GitHub Pages sirve la carpeta `web/`.

## Cómo aplicar cambios a la base
Las migraciones viven en `supabase/migrations/`, numeradas. Se aplican con la CLI de Supabase (`supabase db push`) o desde el conector de Supabase en Claude. Una migración aplicada no se edita: se escribe la siguiente.
