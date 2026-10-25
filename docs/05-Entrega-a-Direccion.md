# 05 — Entrega de SIGAE 1.0 a Dirección (Alondra)

Este documento es para ti, Alondra. Está escrito sin tecnicismos. Dice qué tienes, dónde está, cómo entras, qué hacer la primera semana y cómo seguir cambiando SIGAE con tu propio Claude. Los detalles técnicos viven en `docs/04-Puesta-en-marcha.md` y los prompts para tu Claude en `docs/06-Prompts-para-tu-Claude.md`.

## 1. Qué tienes
SIGAE es tu plataforma de acompañamiento educativo, construida a partir del documento «Experiencias de usuario SIGAE». Tiene cinco perfiles:

| Perfil | Qué hace |
|---|---|
| **Dirección** (tú) | Todo: estudiantes, familias, monitoras, bitácoras y su revisión, calendario, pagos, pendientes y solicitudes, resúmenes semanales y mensuales con PDF, evaluaciones y objetivos por ciclo, indicadores de impacto, Academia SHADOW, materiales y recursos, especialistas, reclutamiento y catálogos. |
| **Monitora** | La bitácora del día en el celular (15 pasos cortos, se guarda sola), su estudiante, sus bitácoras pasadas, calendario, Academia y materiales. |
| **Familia** | La bitácora de cada día, su monitora, próximo pago, resúmenes publicados, objetivos y avances, recursos para familias, terapias y citas, solicitud de reporte. |
| **Especialista / personal escolar** | Solo consulta de lo que tú autorices y solicitudes de visita o reporte. |
| **Postulante** (sin cuenta) | Página pública para postularse y formulario de segunda etapa por enlace. |

Reglas que el sistema cumple por diseño: la decisión siempre es tuya (nada se concluye ni se comparte solo); la pregunta «¿Cómo me sentí como monitora?» solo la ves tú y nunca sale en descargas; nada del historial se borra; todas las listas de opciones se editan desde Catálogos.

## 2. Dónde vive todo (todo está en TUS cuentas)
| Pieza | Dónde | Para qué |
|---|---|---|
| El código | GitHub, repositorio `ShadowM-123/sigae` | Es la fuente de verdad. Cada cambio publicado aquí se ve en la liga pública en 1–3 minutos. |
| La plataforma en internet | `https://shadowm-123.github.io/sigae/web/` | Aquí entran todas las personas. Con `?demo=1` al final se ve la **demo con datos ficticios** (nada de lo que hagas ahí es real). |
| Los datos | Supabase, organización «Shadow Monitoras Educativas», proyecto `sigae` | Base de datos, usuarios, archivos, funciones y correos. |
| Los correos | Resend (pendiente de crear a tu nombre; ver §5) | Confirmaciones de postulación, invitaciones, avisos. |

Quien te ayudó a construir (Biné) entró como **colaborador** en GitHub y como **Developer** en Supabase. Cuando quieras, le quitas el acceso desde esas mismas pantallas; nada depende de él.

## 3. Cómo entras
1. Revisa tu correo shadow.monitoras@gmail.com: tienes una invitación de SIGAE. Ábrela, crea tu contraseña y entras directo como Dirección.
2. Si no la encuentras, en la pantalla de entrada escribe tu correo y toca «¿Olvidaste tu contraseña?»; te llega un enlace nuevo.
3. Entra siempre por `https://shadowm-123.github.io/sigae/web/` (sin `?demo=1`).

## 4. Tu primera semana (en este orden)
1. **Catálogos.** Revisa las listas: opciones de baño, estados de ánimo, formación académica, dimensiones de evaluación, etc. Ajústalas a tu forma de trabajar antes de que nadie capture.
2. **Familias y estudiantes.** Crea cada familia (día de pago y monto) y cada expediente de estudiante (horario, recreo, días, necesidades de apoyo). Desde Reclutamiento → Perfiles de acompañamiento, describe qué monitora necesita cada caso.
3. **Monitoras.** Si ya tienes monitoras, dales de alta desde Reclutamiento → crea su postulación con sus datos y selecciónala, o pide a tu Claude que las cargue (prompt 6). Asígnalas a su estudiante desde el expediente; verás el porcentaje de compatibilidad.
4. **Familias y especialistas con cuenta.** Desde Familias y desde Especialistas, «Invitar por correo»: les llega un enlace para crear su contraseña. A los especialistas decide si pueden leer bitácoras.
5. **Academia.** Sube tu inducción: cursos, lecciones (los videos van en YouTube como «no listado» y aquí pegas la liga) y la evaluación breve. Publica cuando estén listos.
6. **Recursos.** Carga los primeros materiales para monitoras y para familias.
7. **Prueba una semana completa** con una monitora real: bitácora diaria, revisión, el lunes el resumen semanal (sale solo como borrador; tú lo publicas), y la familia leyéndolo desde su celular.

## 5. Lo que falta de tu lado (10 minutos cada uno)
- **Resend (correos automáticos).** Crea la cuenta en resend.com con tu correo, verifica tu dominio si tienes uno, crea una API key y pégala en Supabase → Edge Functions → Secrets como `RESEND_API_KEY`. En Reclutamiento → Ajustes pon el remitente. Hasta entonces, los correos quedan en Reclutamiento → «Correos por enviar», listos para copiar y mandar a mano.
- **Tu agenda de entrevistas.** En Reclutamiento → Ajustes pega la liga de tu página de citas (Google Calendar «Citas» u otra). Así las candidatas eligen horario solas.
- **El logo en PNG.** Pide a tu Claude que lo coloque en `web/assets/img/logo-shadow.png` (hoy hay una versión aproximada en SVG).
- **Las 30 preguntas de `docs/02-Preguntas-abiertas.md`.** Están resueltas con supuestos razonables; cuando tengas un rato, confírmalas o corrígelas con tu Claude (prompt 3).

## 6. Cómo seguir cambiando SIGAE con tu Claude
Todo lo que necesita tu Claude para entender el proyecto viaja dentro del repositorio: `CLAUDE.md` (sus instrucciones), `docs/` (el mapa, las decisiones, la puesta en marcha) y las migraciones de la base. Sigue `docs/06-Prompts-para-tu-Claude.md`: empieza con el prompt 1, pide siempre el plan antes del cambio, pide pruebas en la demo y publica con el prompt 4.

Tres cosas que tu Claude no debe hacer (y `CLAUDE.md` se lo recuerda): instalar frameworks o compiladores, guardar llaves secretas en el código, y tocar los datos reales «para probar». Las pruebas se hacen con la demo (`?demo=1`).

## 7. Si algo se rompe
- La liga pública no carga: espera 3 minutos y recarga; si sigue, pide a tu Claude el prompt 7.
- Alguien no puede entrar: en la pantalla de entrada, «¿Olvidaste tu contraseña?».
- No llegan correos: revisa Reclutamiento → Correos por enviar y la llave de Resend (prompt 8).
- Dudas de datos: nada se borra en SIGAE; lo que no ves probablemente está archivado, retirado o en otro ciclo.

Bienvenida a tu plataforma. Está hecha para que la hagas tuya.
