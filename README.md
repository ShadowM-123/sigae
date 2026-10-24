# SIGAE — Sistema Integral de Gestión de Acompañamiento Educativo

Plataforma de **SHADOW Monitoras Educativas** para operar el acompañamiento de estudiantes en la escuela: bitácoras diarias, expedientes, evaluaciones, familias, monitoras, Academia, materiales, especialistas y reclutamiento.

## Estado
Arquitectura v1 cerrada y pasos A, B y C construidos (24-oct-2026): núcleo, bitácora diaria en celular, portal de la familia, panel de Dirección, calendario, pagos por familia, pendientes y solicitudes, red de apoyo (especialistas y citas) y avisos. Todo contra la base falsa. No está en producción.

## Documentos
- [`docs/01-Arquitectura.md`](docs/01-Arquitectura.md) — el mapa del sistema (léelo primero).
- [`docs/02-Preguntas-abiertas.md`](docs/02-Preguntas-abiertas.md) — lo que falta definir con Dirección y los supuestos vigentes.
- [`docs/03-Decisiones.md`](docs/03-Decisiones.md) — bitácora de decisiones.
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
`git push` a `main`. GitHub Pages sirve la carpeta `web/`.

## Cómo aplicar cambios a la base
Las migraciones viven en `supabase/migrations/`, numeradas. Se aplican con la CLI de Supabase (`supabase db push`) o desde el conector de Supabase en Claude. Una migración aplicada no se edita: se escribe la siguiente.
