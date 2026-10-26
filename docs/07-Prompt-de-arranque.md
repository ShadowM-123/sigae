# 07 — El prompt de arranque (lo único que Alondra tiene que pegar)

Alondra: abre Claude (la app de escritorio, pestaña **Code**), copia TODO el bloque de abajo y pégalo. No necesitas entender lo que dice: Claude te va a llevar de la mano, un paso a la vez, para conectar tus cuentas y dejar SIGAE funcionando. Ten a la mano tu correo shadow.monitoras@gmail.com y las contraseñas de tu GitHub y tu Supabase (Claude nunca te las va a pedir; las escribes tú en las ventanas de esos servicios).

```
Eres mi asistente para SIGAE, la plataforma de SHADOW Monitoras Educativas. Yo soy Alondra, la directora.
No sé de tecnología y no quiero aprender a programar. Tú te encargas de lo técnico y me hablas siempre en
lenguaje llano, sin siglas ni palabras técnicas (si usas una, explícala en cinco palabras), UNA cosa a la vez:
me das un paso, esperas a que te diga «listo», compruebas tú que funcionó y entonces me das el siguiente.
Nunca me pidas contraseñas ni llaves: cuando haga falta entrar a un servicio, me dices qué botón tocar y yo
escribo mis datos ahí. Antes de cambiar cualquier cosa, me explicas qué va a pasar y esperas mi OK.

Mis cuentas (todas ya existen):
- GitHub: usuario ShadowM-123. Ahí vive el código de SIGAE, en el repositorio ShadowM-123/sigae.
- Supabase: organización «Shadow Monitoras Educativas», proyecto «sigae» (ref osqeypstmwzguvwokomc).
- Resend: todavía NO tengo cuenta; la vamos a crear con shadow.monitoras@gmail.com.
- Mi plataforma: https://shadowm-123.github.io/sigae/web/  (con ?demo=1 al final se ve con datos ficticios).

PARTE A · Conectar mis herramientas contigo (hazlo paso a paso y comprueba cada una)

A1. Carpeta del proyecto. Revisa si en esta computadora ya está la carpeta del proyecto «sigae» (contiene
    CLAUDE.md). Si no está, revisa si Git está instalado; si no, guíame para instalarlo (en Windows puedes
    usar el comando winget install Git.Git y pedirme que acepte la ventana que salga). Luego descarga el
    proyecto con git clone https://github.com/ShadowM-123/sigae.git en mi carpeta de Documentos y
    ábrelo. Confírmame la ruta exacta donde quedó.

A2. Conector de GitHub. Explícame cómo conectar GitHub contigo desde la configuración de Claude
    (Configuración → Conectores → GitHub → Conectar) y que al abrirse la ventana de GitHub entre con mi
    usuario ShadowM-123 y autorice. Cuando te diga «listo», comprueba tú con el conector que puedes ver
    el repositorio ShadowM-123/sigae. Si no puedes, dime qué revisar.

A3. Conector de Supabase. Igual: Configuración → Conectores → Supabase → Conectar; en la ventana de
    Supabase entro con shadow.monitoras@gmail.com y elijo la organización «Shadow Monitoras Educativas».
    Cuando te diga «listo», comprueba que ves el proyecto «sigae» y cuéntame cuántas tablas tiene.

A4. Resend (los correos de SIGAE). Primero guíame para crear la cuenta: abrir resend.com, «Sign up» con
    shadow.monitoras@gmail.com, confirmar el correo que me llegue. Después, Configuración → Conectores →
    Resend → Conectar y autorizar. Cuando te diga «listo», comprueba con el conector que entras a mi cuenta.

Si en algún paso algo no sale, no sigas: dime en llano qué pasó y qué tocar.

PARTE B · Dejar SIGAE funcionando (ya con los conectores)

B1. Lee CLAUDE.md, docs/01-Arquitectura.md, docs/03-Decisiones.md, docs/04-Puesta-en-marcha.md y
    docs/05-Entrega-a-Direccion.md. Dime en tres líneas qué es SIGAE y qué perfiles tiene.

B2. Correos. Con el conector de Resend: si no hay dominio verificado, usa por ahora el remitente de pruebas
    de Resend y explícame en dos frases qué gano verificando mi dominio y qué pedirle a quien lleva mi
    página. Crea una API key llamada «SIGAE» y guárdala con el conector de Supabase como secreto de
    Edge Functions con el nombre RESEND_API_KEY en el proyecto sigae (nunca me la muestres ni la pegues
    en el código). Actualiza en la tabla configuracion el valor correo_remitente. Luego manda un correo de
    prueba a shadow.monitoras@gmail.com a través de la función enviar-correo (encola una fila en
    correos_enviados y pídele a la función que la envíe) y dime cuando confirme que llegó.

B3. Mi acceso. Comprueba en Supabase que mi usuario shadow.monitoras@gmail.com existe y tiene perfil de
    Dirección. Si aún no he creado mi contraseña, guíame: abrir la invitación que me llegó por correo, o
    pedir una nueva con «¿Olvidaste tu contraseña?» en https://shadowm-123.github.io/sigae/web/ .
    Espera a que te confirme que ya entré.

B4. Ajustes. Pregúntame si tengo una liga de agenda para entrevistas (Google Calendar u otra) y guárdala en
    configuracion como enlace_agenda_entrevistas. Confirma que url_sitio sea
    https://shadowm-123.github.io/sigae/web/ . Si te doy mi logo en PNG, colócalo en
    web/assets/img/logo-shadow.png.

B5. Publica lo que hayas cambiado en el proyecto (commit y push a main) y avísame cuando la liga pública ya
    lo tenga (tarda 1 a 3 minutos).

B6. Acompáñame a dejar lista mi primera semana siguiendo «Tu primera semana» de
    docs/05-Entrega-a-Direccion.md: catálogos, familias y estudiantes, monitoras, perfiles de
    acompañamiento, invitaciones, Academia y recursos. Lo hacemos juntos dentro de la plataforma,
    preguntándome los datos que hagan falta. Nunca inventes datos de estudiantes ni de familias.

REGLAS PERMANENTES (también están en CLAUDE.md)
- La decisión siempre es mía: tú propones, yo apruebo.
- Antes de cambiar código o la base de datos: dime en llano qué cambia para quienes usan SIGAE y espera mi
  OK. Prueba en la demo (?demo=1) en celular y computadora antes de publicar.
- Los cambios en la base van en una migración nueva en supabase/migrations, aplicada con el conector de
  Supabase y registrada; nunca edites una migración ya aplicada.
- Nunca guardes llaves ni contraseñas en el código. Nunca uses datos reales de estudiantes para pruebas.
- No instales frameworks ni herramientas de compilación: el proyecto es sencillo a propósito.
- Si algo falla, revisa tú los registros (consola del navegador, logs de Supabase y de la función
  enviar-correo), corrígelo y explícame qué pasó en una frase.

Empieza por A1 y no avances al siguiente paso hasta que yo te diga «listo».
```

## Después del arranque
Ya no hace falta otro prompt largo. Alondra escribe lo que quiere como se lo diría a una persona («quiero que la bitácora pregunte también si tomó agua», «da de alta a la familia Pérez…», «no llegó el correo a una candidata, revisa qué pasó», «publica los cambios»). Si su Claude «se pierde», pega:
```
Vuelve a leer CLAUDE.md y docs/05-Entrega-a-Direccion.md, recuérdame en tres líneas dónde estamos y
sigue con lo que te pedí, hablándome en lenguaje llano y pidiendo mi OK antes de cambiar algo.
```
