# 04 — Puesta en marcha: cuentas, repositorio, base y publicación

Este documento dice **dónde vive SIGAE en internet**, con qué cuentas, y cómo se conectan las piezas. Léelo antes de publicar o de tocar la base real. No contiene secretos: las llaves privadas viven solo en Supabase.

## 1. Las cuentas (todas de SHADOW)
| Pieza | Cuenta | Qué hace |
|---|---|---|
| GitHub | usuario `ShadowM-123` (correo shadow.monitoras@gmail.com) | Guarda el código y publica la aplicación con GitHub Pages. |
| Supabase | organización «Shadow Monitoras Educativas» (slug `wshmulttleiwqtmrbwvs`, plan Free) | Base de datos, usuarios, archivos, funciones y tareas programadas. |
| Resend | pendiente de crear a nombre de SHADOW | Correos transaccionales (avisos, recordatorios, postulaciones). |

**Regla:** la dueña de todo es SHADOW. Quien ayuda a construir entra como **colaborador** (GitHub) o **miembro de la organización** (Supabase), y Dirección puede retirar ese acceso cuando quiera desde la misma pantalla donde lo dio. Nunca se comparten contraseñas por chat ni se guardan en el repositorio.

### Accesos concedidos
| Fecha | Quién | Dónde | Rol | Por qué |
|---|---|---|---|---|
| 2026-10-25 | menyacosta28-glitch (Manuel Acosta, Biné) | GitHub `ShadowM-123/sigae` | Colaborador (write) | Subir el código durante el desarrollo. |
| 2026-10-25 | menyacosta.28@gmail.com | Supabase org «Shadow Monitoras Educativas» | Developer | Aplicar migraciones, cargar datos y desplegar funciones (no crea ni borra proyectos). |

Cuando el desarrollo termine, Dirección puede bajar estos accesos a «Developer» / lectura, o quitarlos.

## 2. El repositorio
- URL: `https://github.com/ShadowM-123/sigae` (público: GitHub Pages gratuito lo exige; el código no lleva secretos).
- Rama de producción: `main`. **Un `git push` a `main` publica.**
- GitHub Pages sirve la **raíz** del repositorio; el `index.html` de la raíz redirige a `web/index.html` conservando `?demo=1`.
- Dirección URL pública: `https://shadowm-123.github.io/sigae/` (demo: `https://shadowm-123.github.io/sigae/?demo=1`).

### Cómo se activó Pages
Settings → Pages → *Build and deployment* → Source: **Deploy from a branch** → Branch: `main`, carpeta `/ (root)` → Save. Tarda 1–3 minutos la primera vez.

## 3. El proyecto de Supabase
- Nombre: `sigae`. Ref: `osqeypstmwzguvwokomc`. Región: Americas (us-east-1). Creado el 2026-10-25 desde la cuenta de SHADOW, con «Enable automatic RLS» activado. URL: `https://osqeypstmwzguvwokomc.supabase.co`.
- La **URL del proyecto y la llave pública (anon)** van en `web/assets/js/supabase.js` (`CONFIG`). Son públicas por diseño: la seguridad la ponen las políticas RLS.
- La **llave de servicio (service_role)** y la **llave de Resend** NUNCA van al repo: se guardan como *secrets* de Edge Functions en Supabase.
- La contraseña de la base de datos la genera Supabase al crear el proyecto; no hace falta para operar SIGAE (todo se hace por el tablero, las migraciones y las funciones). Si algún día se necesita, se restablece desde Settings → Database.

### Migraciones
Las migraciones viven en `supabase/migrations/` y se aplican **en orden** y **una sola vez**:
1. `0001_nucleo.sql` — perfiles, familias, estudiantes, monitoras, asignaciones, catálogos, RLS.
2. `0002_bitacora_y_seguimiento.sql` — bitácoras y sus subtablas (incluida la confidencial), ciclos, objetivos, evaluaciones, pagos, tareas, solicitudes, notificaciones.
3. `0003_calendario_citas_especialistas.sql` — eventos, especialistas por estudiante, citas, historial de solicitudes.
4. `0004_resumenes.sql` — resúmenes semanales y mensuales.
5. `0005_academia_materiales.sql` — Academia (cursos, lecciones, cuestionarios, progreso, intentos), materiales y recursos, buckets `fotos-bitacoras`, `materiales` y `academia` con sus políticas.
6. `0006_especialistas.sql` — acceso de consulta para especialistas y personal escolar con cuenta; `puede_ver_bitacora` incluye al especialista autorizado.
7. `0007_reclutamiento.sql` — configuración, perfiles de acompañamiento, postulaciones (funciones públicas `postular`, `segunda_etapa_cargar`, `segunda_etapa_guardar`), referencias, historial, correos pendientes, bucket `curriculums` y `seleccionar_postulante`.

Se aplican con la herramienta del repo `supabase/herramientas/supabase_api.py` (`python supabase_api.py migrar supabase/migrations/0001_nucleo.sql`), que usa la Management API con un **token personal** de una cuenta miembro de la organización, guardado en `<carpeta que contiene al repo>/.supabase-token.txt` (fuera del repo, nunca en el chat). También pueden pegarse en el SQL Editor del tablero. El conector de Supabase de Claude solo ve la organización con la que se autorizó, por eso existe la herramienta. Una migración aplicada **no se edita**: se escribe la siguiente.

### Después de las migraciones
- Authentication → Providers: solo **Email** (contraseña). Desactivar «Confirm email» mientras Dirección da de alta a las personas a mano; activar cuando entre la función `crear-usuario`.
- Authentication → URL Configuration: Site URL `https://shadowm-123.github.io/sigae/web/` y Redirect URLs con esa misma raíz.
- Storage: los buckets privados `fotos-bitacoras`, `materiales` y `academia` y sus políticas los crea la migración `0005`. No hay nada que configurar a mano.
- Primer usuario: Dirección se crea desde Authentication → Users → *Add user*, y luego se inserta su fila en `perfiles` con rol `direccion` (ver `supabase/seed/`).
- Páginas públicas (sin cuenta): `web/postulacion.html` (postulación) y `web/segunda-etapa.html?t=<token>` (segunda etapa). En Dirección → Reclutamiento → Ajustes se captura la URL pública, la liga de agenda para entrevistas y el remitente.
- Usuarios de especialistas y de monitoras seleccionadas: hasta que esté Resend, se crean o invitan desde Authentication → Users con su correo y luego se vinculan/seleccionan desde Dirección.

## 4. Correos: Edge Function `enviar-correo` + Resend
- La función `supabase/functions/enviar-correo/index.ts` está **desplegada** en el proyecto (Edge Functions → enviar-correo). Hace dos cosas: envía por Resend los correos pendientes de `correos_enviados` y, con `{ accion: 'invitar' }`, invita usuarios (familias, especialistas, monitoras seleccionadas) con la llave de servicio, que nunca sale de Supabase. Solo la puede llamar Dirección (JWT) o un cron con `CRON_KEY`.
- El frontend la llama solo: después de encolar un correo (`correos.js`) y al invitar desde Especialistas o al seleccionar una postulante. Botón «Enviar pendientes ahora» en Reclutamiento → Correos por enviar.
- Si se vuelve a desplegar desde el tablero (Edge Functions → enviar-correo → editor), pega el contenido del archivo del repo; con la CLI: `supabase functions deploy enviar-correo`.

### Resend (lo que falta: cuenta a nombre de SHADOW)
1. Crear la cuenta en resend.com con shadow.monitoras@gmail.com.
2. Verificar el dominio de SHADOW (si no hay dominio propio, empezar con el remitente de pruebas `onboarding@resend.dev` solo hacia correos del equipo).
3. Crear una API key «SIGAE producción» y guardarla en Supabase → Edge Functions → Secrets como `RESEND_API_KEY`. No pegarla en el chat ni en el repo.

## 5. Modo demo en producción
La liga pública con `?demo=1` sigue usando la base falsa (datos ficticios en el navegador de quien la abre). Sirve para enseñar el sistema sin tocar datos reales. Sin `?demo=1`, la página usa el proyecto real de Supabase.

## 6. Bitácora de la puesta en marcha
- **2026-10-25** — Repositorio `ShadowM-123/sigae` creado desde la cuenta de SHADOW; menyacosta28-glitch agregado como colaborador; código subido; GitHub Pages activado desde `main` (raíz).
- **2026-10-25** — menyacosta.28@gmail.com aceptó la invitación a la organización de Supabase. Se bajó su rol a **Developer**: el plan Free cuenta los proyectos gratuitos de cada administrador en todas sus organizaciones, y con rol Administrador bloqueaba la creación del proyecto.
- **2026-10-25** — Proyecto `sigae` creado desde la cuenta de SHADOW. Migraciones 0001–0004 aplicadas desde el SQL Editor del tablero (cargadas desde el repo público) y registradas en `supabase_migrations.schema_migrations` con versiones `2026102500000N`. Resultado: 26 tablas, 62 catálogos, 68 políticas RLS.
- **2026-10-25** — URL y llave publishable puestas en `web/assets/js/supabase.js`.
