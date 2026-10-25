# CLAUDE.md — SIGAE (SHADOW Monitoras Educativas)

Eres el ingeniero de cabecera de SIGAE, el sistema de gestión de acompañamiento educativo de SHADOW. Este archivo te dice cómo trabajar aquí. Léelo completo antes de tocar nada.

## Antes de empezar cualquier tarea
1. Lee `docs/01-Arquitectura.md`. Es el mapa: roles, permisos, modelo de datos, flujos, stack y decisiones.
2. Lee `docs/03-Decisiones.md` (las últimas entradas) para saber qué se decidió después del documento de arquitectura.
3. Si vas a publicar, tocar la base real o las cuentas, lee `docs/04-Puesta-en-marcha.md`.
4. Si la tarea toca algo que está en `docs/02-Preguntas-abiertas.md`, usa el supuesto indicado ahí o pregunta a Dirección; no inventes una respuesta nueva.

## Reglas que no se negocian
- **La decisión es de Dirección.** El sistema sugiere, no decide. No agregues automatismos que concluyan, califiquen o compartan información sin que Dirección lo publique o autorice.
- **Confidencialidad en la base, no solo en pantalla.** Todo acceso se controla con políticas RLS en Supabase. La sección «¿Cómo me sentí como monitora?» vive en su propia tabla y jamás se incluye en vistas de familia o especialista ni en descargas.
- **Nunca se borra historial.** Asignaciones, bitácoras, evaluaciones, solicitudes y postulaciones se cierran o archivan; no se eliminan ni se sobreescriben al cambiar de etapa.
- **Catálogos antes que código.** Toda lista de opciones (baño, bloques, estados de ánimo, formación…) vive en la tabla `catalogos` y se edita desde Dirección. No las quemes en el HTML.
- **Sin secretos en el repo.** Llaves de Resend y de servicio solo en Supabase (secrets de Edge Functions). En el frontend solo la URL del proyecto y la llave pública (anon).
- **Datos reales con cuidado.** Son menores de edad y sus familias. No copies datos reales a pruebas, capturas ni chats. Las pruebas usan la base falsa (`?demo=1`) y `supabase/seed/`.

## Si trabajas para Dirección (Alondra) después de la entrega
- Lee también `docs/05-Entrega-a-Direccion.md` (qué recibió y qué sigue) y `docs/06-Prompts-para-tu-Claude.md` (cómo te va a pedir las cosas).
- Explícale siempre en lenguaje llano y pídele su OK antes de cambiar código o base. Prueba en `?demo=1` (celular y computadora) antes de publicar.
- La base real se cambia solo con migraciones nuevas en `supabase/migrations/` (numeradas, nunca editar una aplicada), aplicadas con el conector de Supabase de su cuenta o pegadas en el SQL Editor de su proyecto (`osqeypstmwzguvwokomc`). Registra cada una en `supabase_migrations.schema_migrations`.
- Los correos salen por la Edge Function `enviar-correo` (Resend). Si falta `RESEND_API_KEY`, quedan en `correos_enviados` como pendientes y Dirección los copia a mano.

## Cómo está armado (resumen)
- `web/`: frontend plano (HTML + CSS + JS por módulos, sin compilación). Lo publica GitHub Pages desde `main`. Un `git push` publica.
- `supabase/migrations/`: esquema, RLS y catálogos. Numeradas. **Una migración aplicada no se edita**; se escribe otra.
- `supabase/functions/`: Edge Functions (correos por Resend, postulación pública, compatibilidad, resúmenes, recordatorios, alta de usuarios).
- `web/assets/js/demo/supabase-falso.js`: base de mentiras para probar sin tocar producción. Las páginas aceptan `?demo=1`. Si agregas una tabla o columna en una migración, agrégala también a la semilla de la base falsa.

## Cómo correr en local
Los archivos usan módulos de JavaScript, así que no abren bien con doble clic (`file://`). Sirve la carpeta del repo con cualquier servidor estático, por ejemplo:
```
python -m http.server 8766
```
y abre `http://localhost:8766/web/index.html?demo=1`.

## Cómo trabajar
- Tareas chicas (texto, un campo, un estilo): edita, prueba en local con `?demo=1`, haz commit con mensaje claro en español y push.
- Tareas que cambian la base: escribe la migración nueva, pruébala, aplícala, y actualiza `docs/01-Arquitectura.md` si cambia el modelo. Anota la decisión en `docs/03-Decisiones.md`.
- Siempre prueba en celular (viewport 390 px) lo que toque a monitoras o familias.
- Cuando termines algo que Dirección va a usar, explícaselo en lenguaje llano, sin tecnicismos, y di qué puede y qué no puede hacer todavía.

## Qué NO hacer
- No instalar frameworks ni herramientas de compilación (React, Vite, npm build). El proyecto es plano a propósito, para que cualquiera lo mantenga.
- No mover videos a Supabase Storage; van en YouTube no listado o Vimeo y se guarda el enlace.
- No crear tablas, buckets o funciones fuera de las migraciones y del repo.
- No tocar producción para «ver si funciona». Primero `?demo=1`, luego seed, luego producción.
