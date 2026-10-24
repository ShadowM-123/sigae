# SIGAE — Bitácora de decisiones

Las decisiones de arranque están en `01-Arquitectura.md` §11. Aquí van las posteriores, la más reciente arriba. Formato: fecha · decisión · por qué · quién.

## 2026-10-24 — Pasos A y B construidos
- La base falsa se mueve a `web/assets/js/demo/supabase-falso.js` (no a `.claude/`) para poder publicar la demo en GitHub Pages. — Claude.
- Las migraciones `0001_nucleo.sql` y `0002_bitacora_y_seguimiento.sql` se escriben desde ahora, aunque no se apliquen hasta el paso I: la base falsa copia exactamente su forma. — Claude.
- El borrador de la bitácora se guarda en cada paso (`paso_actual`), y «¿Cómo me sentí?» va en tabla aparte con sus propias políticas. — según arquitectura.
- Sección «Trabajo durante las clases»: el recreo del expediente se marca «No aplica» automáticamente; la opción «No aplica» solo aparece en bloques de recreo. — Claude (supuesto #4 de preguntas abiertas).

## 2026-10-24 — Arranque
- Se adopta la arquitectura v1 (`01-Arquitectura.md`) y el orden de construcción A→J. — Manuel Acosta.
- Correo transaccional: **Resend**, con cuenta a nombre de SHADOW (pendiente crearla y verificar dominio). — Manuel Acosta.
- El repositorio se construye en `BINÉ\Clientes\SHADOW — SIGAE\sigae` y se sube al GitHub de SHADOW en el paso I, con todo su historial. — Claude, con visto bueno de Manuel.
