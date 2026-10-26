# 06 — Prompts listos para tu Claude Code

Alondra: estos prompts están pensados para que los copies y pegues tal cual en **Claude Code** (la app de escritorio o la terminal), con la carpeta del proyecto abierta. Tu Claude leerá primero el archivo `CLAUDE.md` del repositorio, que le explica cómo está armado SIGAE y qué reglas no se negocian. No necesitas saber programar: describe lo que quieres en tus palabras y pídele siempre que te explique en lenguaje llano.

## Antes de empezar (una sola vez)
Pega el **prompt de arranque** de `docs/07-Prompt-de-arranque.md`. Él te guía para descargar el proyecto y conectar GitHub, Supabase y Resend con tu Claude, y deja SIGAE funcionando. Los prompts de abajo son para después, en el día a día.

## Prompt 1 · Conocer el proyecto (empieza siempre aquí)
```
Lee CLAUDE.md, docs/01-Arquitectura.md, docs/03-Decisiones.md y docs/04-Puesta-en-marcha.md.
Después explícame en lenguaje llano, sin tecnicismos: qué hace SIGAE hoy, qué perfiles tiene,
dónde vive cada cosa (GitHub, Supabase, Resend) y qué sigue pendiente. No cambies nada todavía.
```

## Prompt 2 · Ver la demo en mi computadora
```
Levanta el servidor local como dice CLAUDE.md y abre la demo con ?demo=1.
Dime la liga para entrar y qué usuario de prueba uso para cada perfil.
```

## Prompt 3 · Pedir un cambio (plantilla)
```
Quiero este cambio en SIGAE: [describe qué quieres, para quién y por qué].
Antes de tocar código: dime cómo lo harías, qué archivos cambiarías y si afecta a la base de datos.
Espera mi OK. Cuando lo hagas, pruébalo en la demo (?demo=1) en celular y computadora,
y cuando termine explícame qué cambió y cómo lo veo.
```
Ejemplos de cambios que puedes pedir así:
- «Agrega al formulario de la bitácora una pregunta sobre si tomó agua, con opciones sí / poco / no.»
- «Quiero que el resumen semanal también mencione cuántos días comió completo el lonche.»
- «Cambia los textos de los correos de reclutamiento por estos: …»

## Prompt 4 · Publicar los cambios
```
Revisa que todo esté probado y publica los cambios con git push a main.
Confírmame la liga pública y, si la publicación tarda, dime cuánto esperar.
```

## Prompt 5 · Cambios en la base de datos
```
Este cambio necesita una tabla o columna nueva. Escribe una migración NUEVA en
supabase/migrations (no edites las anteriores), aplícala en mi proyecto de Supabase
con el conector, agrega lo mismo a la base falsa de la demo y actualiza docs/01-Arquitectura.md.
Explícame qué datos nuevos se guardarán y quién podrá verlos.
```

## Prompt 6 · Dar de alta personas
```
Explícame paso a paso, desde SIGAE, cómo doy de alta a una familia, a una monitora
y a un especialista, y qué correo les llega. Si algo todavía se hace desde Supabase, dime
exactamente dónde dar clic.
```

## Prompt 7 · Cuando algo falla
```
Algo no funciona: [describe qué hiciste, qué esperabas y qué pasó; pega el mensaje de error si lo hay].
Revisa la consola del navegador y los logs de Supabase, encuentra la causa, corrígela,
pruébalo y explícame qué pasó en lenguaje llano.
```

## Prompt 8 · Correos (Resend)
```
Revisa que los correos de SIGAE salgan por Resend: la función enviar-correo, el secreto
RESEND_API_KEY y el dominio verificado. Si falta algo, dime qué y guíame para hacerlo.
Manda un correo de prueba a mi dirección y confírmame que llegó.
```

## Prompt 9 · Respaldo y orden
```
Haz un respaldo de la base de datos de SIGAE (exporta las tablas principales a archivos CSV
en una carpeta fuera del repositorio) y dime dónde quedó. No subas datos de estudiantes a GitHub.
```

## Tres reglas para hablar con tu Claude
- **Pide el plan antes del cambio.** «Dime cómo lo harías y espera mi OK» evita sorpresas.
- **Pide pruebas.** «Pruébalo en la demo en celular» antes de publicar.
- **Pide explicación llana.** Si no entiendes algo, di «explícamelo como a alguien que no programa».

Si tu Claude propone instalar herramientas nuevas (React, frameworks, compiladores) o guardar llaves secretas en el código, dile que no: `CLAUDE.md` lo prohíbe a propósito para que el proyecto siga siendo sencillo y seguro.
