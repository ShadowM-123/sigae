-- 0007 — Paso H: reclutamiento y selección de monitoras.
-- Postulación pública sin cuenta (RPC con security definer: la tabla no se abre al público), segunda etapa por enlace con
-- token, perfiles de acompañamiento por estudiante con pesos, compatibilidad guardada, historial, correos pendientes
-- de envío (hasta que Resend esté conectado) y conversión de la postulante seleccionada en monitora copiando sus datos.
-- Ver docs/01-Arquitectura.md §4.5, §5 y §6.

-- ---------- configuración simple (clave → valor) ----------
create table public.configuracion (
  clave text primary key,
  valor text,
  descripcion text,
  actualizado_en timestamptz not null default now()
);
insert into public.configuracion (clave, valor, descripcion) values
  ('enlace_agenda_entrevistas', '', 'Liga a la página de citas de Dirección (Google Calendar «Citas» u otra) que se manda al invitar a entrevista.'),
  ('correo_remitente', 'SHADOW Monitoras Educativas <hola@shadow.mx>', 'Remitente de los correos (debe ser un dominio verificado en Resend).'),
  ('url_sitio', 'https://shadowm-123.github.io/sigae/web/', 'Dirección pública de SIGAE, para armar los enlaces de los correos.')
on conflict (clave) do nothing;

-- ---------- perfiles de acompañamiento (lo que se busca para cada estudiante) ----------
create table public.perfiles_acompanamiento (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references public.estudiantes(id),
  nombre text not null,                           -- p. ej. «Monitora para Santiago · ciclo 2026-2027»
  formacion_requerida text[] not null default '{}',   -- claves del catálogo formacion_academica
  formacion_deseable text[] not null default '{}',
  experiencia text,                               -- descripción libre
  experiencia_min_anios smallint,
  necesidades text[] not null default '{}',       -- necesidades de apoyo / perfiles de desarrollo (palabras clave)
  habilidades text[] not null default '{}',
  conocimientos text[] not null default '{}',
  caracteristicas text,
  edad_min smallint, edad_max smallint,
  zona text,
  direccion_escuela text,
  hora_inicio time, hora_fin time,
  dias smallint[] not null default '{1,2,3,4,5}',
  otros_requisitos text,
  pesos jsonb not null default '{"formacion":25,"experiencia":25,"necesidades":20,"disponibilidad":15,"zona":15}'::jsonb,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create trigger t_perfacomp_act before update on public.perfiles_acompanamiento for each row execute function public.tocar_actualizado_en();

-- ---------- postulaciones ----------
create sequence if not exists public.postulaciones_folio_seq;
create table public.postulaciones (
  id uuid primary key default gen_random_uuid(),
  folio text not null unique,
  nombre_original text not null,
  nombre_normalizado text not null,
  correo text not null,
  telefono text,
  cv_path text,
  como_se_entero text,
  etapa text not null default 'recibida' check (etapa in ('recibida','invitada_2a_etapa','2a_etapa_completa','invitada_entrevista','entrevista_agendada','entrevistada','seleccionada','cerrada')),
  etapa_al_cerrar text,                 -- en qué etapa estaba cuando se cerró
  perfil_acompanamiento_id uuid references public.perfiles_acompanamiento(id),
  compatibilidad jsonb,                 -- { porcentaje, desglose: {criterio: {puntaje, peso, nota}}, perfil_id, calculado_en, parcial }
  token_2a_etapa text not null unique default replace(gen_random_uuid()::text, '-', ''),
  entrevista_fecha timestamptz,
  entrevista_notas text,
  notas_direccion text,
  motivo_cierre text,
  monitora_perfil_id uuid references public.perfiles(id),   -- se llena al seleccionar
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create trigger t_postulaciones_act before update on public.postulaciones for each row execute function public.tocar_actualizado_en();
create index postulaciones_correo on public.postulaciones (lower(correo));
create index postulaciones_nombre on public.postulaciones (nombre_normalizado);

create table public.postulacion_detalle (
  postulacion_id uuid primary key references public.postulaciones(id) on delete cascade,
  edad smallint, fecha_nacimiento date,
  calle_numero text, colonia text, cp text, ciudad text,
  formacion text, formacion_otra text, tiene_titulo boolean, tiene_cedula boolean, cedula text,
  intereses text,
  trabaja_actualmente boolean, horario_actual text,
  disponibilidad jsonb not null default '{}'::jsonb,   -- { dias: [1..7], hora_inicio, hora_fin, notas }
  expectativa_economica text,
  sabe_que_es_monitora text, por_que_candidata text,
  experiencia_texto text,                               -- resumen de experiencia que escribe la persona
  completado_en timestamptz
);
create table public.referencias (
  id uuid primary key default gen_random_uuid(),
  postulacion_id uuid not null references public.postulaciones(id) on delete cascade,
  centro_trabajo text, nombre text, cargo text, contacto text
);
create table public.postulacion_historial (
  id uuid primary key default gen_random_uuid(),
  postulacion_id uuid not null references public.postulaciones(id) on delete cascade,
  evento text not null,
  detalle text,
  por uuid references public.perfiles(id),
  fecha timestamptz not null default now()
);
-- Correos: hasta que Resend esté conectado quedan «pendientes» con el texto listo para copiar; la función enviar-correo los procesa después.
create table public.correos_enviados (
  id uuid primary key default gen_random_uuid(),
  destinatario text not null,
  plantilla text not null,
  asunto text not null,
  cuerpo text,
  relacion text,                 -- p. ej. postulacion:<id>
  resend_id text,
  estado text not null default 'pendiente' check (estado in ('pendiente','enviado','error','copiado')),
  error text,
  fecha timestamptz not null default now()
);

-- ---------- RLS ----------
alter table public.configuracion enable row level security;
alter table public.perfiles_acompanamiento enable row level security;
alter table public.postulaciones enable row level security;
alter table public.postulacion_detalle enable row level security;
alter table public.referencias enable row level security;
alter table public.postulacion_historial enable row level security;
alter table public.correos_enviados enable row level security;

create policy config_dir on public.configuracion for all using (public.es_direccion()) with check (public.es_direccion());
create policy perfacomp_dir on public.perfiles_acompanamiento for all using (public.es_direccion()) with check (public.es_direccion());
create policy postulaciones_dir on public.postulaciones for all using (public.es_direccion()) with check (public.es_direccion());
create policy detalle_dir on public.postulacion_detalle for all using (public.es_direccion()) with check (public.es_direccion());
create policy referencias_dir on public.referencias for all using (public.es_direccion()) with check (public.es_direccion());
create policy post_hist_dir on public.postulacion_historial for all using (public.es_direccion()) with check (public.es_direccion());
create policy correos_dir on public.correos_enviados for all using (public.es_direccion()) with check (public.es_direccion());
-- El público (sin sesión) solo lee los catálogos que necesita el formulario
create policy catalogos_publico on public.catalogos for select to anon using (activo and tipo in ('como_se_entero','formacion_academica'));

-- ---------- Storage: currículums ----------
insert into storage.buckets (id, name, public) values ('curriculums', 'curriculums', false) on conflict (id) do nothing;
-- Cualquiera puede SUBIR su CV a la carpeta entrantes/ (nunca listar ni leer); Dirección lee y administra todo.
create policy cv_subir_publico on storage.objects for insert to anon, authenticated with check (bucket_id = 'curriculums' and split_part(name, '/', 1) = 'entrantes');
create policy cv_dir on storage.objects for all to authenticated using (bucket_id = 'curriculums' and public.es_direccion()) with check (bucket_id = 'curriculums' and public.es_direccion());

-- ---------- Funciones públicas (security definer): la tabla no se expone, solo estas puertas ----------
create or replace function public.normalizar_nombre(t text) returns text language sql immutable as $$
  select regexp_replace(lower(translate(coalesce(t, ''), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')), '\s+', ' ', 'g')
$$;

-- 1ª etapa: recibe la postulación. Devuelve folio e id. Límite sencillo: 3 postulaciones por correo en 30 días.
create or replace function public.postular(p_nombre text, p_correo text, p_telefono text, p_como_se_entero text, p_cv_path text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_folio text; v_n int;
begin
  if coalesce(trim(p_nombre), '') = '' or p_correo !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Nombre y correo válidos son obligatorios'; end if;
  select count(*) into v_n from public.postulaciones where lower(correo) = lower(p_correo) and creado_en > now() - interval '30 days';
  if v_n >= 3 then raise exception 'Ya recibimos postulaciones recientes con este correo. Si necesitas corregir algo, escríbenos.'; end if;
  v_folio := 'SH-' || to_char(now(), 'YYMM') || '-' || lpad(nextval('public.postulaciones_folio_seq')::text, 4, '0');
  insert into public.postulaciones (folio, nombre_original, nombre_normalizado, correo, telefono, cv_path, como_se_entero)
  values (v_folio, trim(p_nombre), public.normalizar_nombre(p_nombre), lower(trim(p_correo)), nullif(trim(p_telefono), ''), p_cv_path, p_como_se_entero) returning id into v_id;
  insert into public.postulacion_historial (postulacion_id, evento, detalle) values (v_id, 'recibida', 'Postulación recibida desde la página pública');
  insert into public.correos_enviados (destinatario, plantilla, asunto, cuerpo, relacion) values (lower(trim(p_correo)), 'postulacion_recibida', 'Recibimos tu postulación · SHADOW',
    'Hola ' || trim(p_nombre) || ', recibimos tu postulación (folio ' || v_folio || '). Dirección la revisará y te escribiremos a este correo. Gracias por tu interés en SHADOW.', 'postulacion:' || v_id);
  return jsonb_build_object('id', v_id, 'folio', v_folio);
end $$;
grant execute on function public.postular(text, text, text, text, text) to anon, authenticated;

-- 2ª etapa: carga lo mínimo de la postulación a partir del token (solo si fue invitada).
create or replace function public.segunda_etapa_cargar(p_token text) returns jsonb language plpgsql security definer set search_path = public as $$
declare p record; d record;
begin
  select * into p from public.postulaciones where token_2a_etapa = p_token;
  if p is null then raise exception 'Enlace no válido'; end if;
  if p.etapa not in ('invitada_2a_etapa', '2a_etapa_completa') then raise exception 'Este enlace ya no está activo'; end if;
  select * into d from public.postulacion_detalle where postulacion_id = p.id;
  return jsonb_build_object('folio', p.folio, 'nombre', p.nombre_original, 'correo', p.correo, 'telefono', p.telefono, 'completada', p.etapa = '2a_etapa_completa', 'detalle', coalesce(to_jsonb(d), '{}'::jsonb) || jsonb_build_object('referencias', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from public.referencias r where r.postulacion_id = p.id)));
end $$;
grant execute on function public.segunda_etapa_cargar(text) to anon, authenticated;

-- 2ª etapa: guarda el formulario completo en la MISMA postulación (nunca crea otra).
create or replace function public.segunda_etapa_guardar(p_token text, p_detalle jsonb, p_referencias jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare p record; r jsonb;
begin
  select * into p from public.postulaciones where token_2a_etapa = p_token;
  if p is null or p.etapa not in ('invitada_2a_etapa', '2a_etapa_completa') then raise exception 'Enlace no válido o vencido'; end if;
  insert into public.postulacion_detalle (postulacion_id, edad, fecha_nacimiento, calle_numero, colonia, cp, ciudad, formacion, formacion_otra, tiene_titulo, tiene_cedula, cedula, intereses, trabaja_actualmente, horario_actual, disponibilidad, expectativa_economica, sabe_que_es_monitora, por_que_candidata, experiencia_texto, completado_en)
  values (p.id, (p_detalle->>'edad')::smallint, (p_detalle->>'fecha_nacimiento')::date, p_detalle->>'calle_numero', p_detalle->>'colonia', p_detalle->>'cp', p_detalle->>'ciudad', p_detalle->>'formacion', p_detalle->>'formacion_otra', (p_detalle->>'tiene_titulo')::boolean, (p_detalle->>'tiene_cedula')::boolean, p_detalle->>'cedula', p_detalle->>'intereses', (p_detalle->>'trabaja_actualmente')::boolean, p_detalle->>'horario_actual', coalesce(p_detalle->'disponibilidad', '{}'::jsonb), p_detalle->>'expectativa_economica', p_detalle->>'sabe_que_es_monitora', p_detalle->>'por_que_candidata', p_detalle->>'experiencia_texto', now())
  on conflict (postulacion_id) do update set edad = excluded.edad, fecha_nacimiento = excluded.fecha_nacimiento, calle_numero = excluded.calle_numero, colonia = excluded.colonia, cp = excluded.cp, ciudad = excluded.ciudad, formacion = excluded.formacion, formacion_otra = excluded.formacion_otra, tiene_titulo = excluded.tiene_titulo, tiene_cedula = excluded.tiene_cedula, cedula = excluded.cedula, intereses = excluded.intereses, trabaja_actualmente = excluded.trabaja_actualmente, horario_actual = excluded.horario_actual, disponibilidad = excluded.disponibilidad, expectativa_economica = excluded.expectativa_economica, sabe_que_es_monitora = excluded.sabe_que_es_monitora, por_que_candidata = excluded.por_que_candidata, experiencia_texto = excluded.experiencia_texto, completado_en = now();
  delete from public.referencias where postulacion_id = p.id;
  for r in select * from jsonb_array_elements(coalesce(p_referencias, '[]'::jsonb)) loop
    insert into public.referencias (postulacion_id, centro_trabajo, nombre, cargo, contacto) values (p.id, r->>'centro_trabajo', r->>'nombre', r->>'cargo', r->>'contacto');
  end loop;
  update public.postulaciones set etapa = '2a_etapa_completa' where id = p.id and etapa = 'invitada_2a_etapa';
  insert into public.postulacion_historial (postulacion_id, evento, detalle) values (p.id, '2a_etapa_completa', 'Formulario de segunda etapa recibido');
  return jsonb_build_object('ok', true, 'folio', p.folio);
end $$;
grant execute on function public.segunda_etapa_guardar(text, jsonb, jsonb) to anon, authenticated;

-- Selección: convierte la postulación en monitora copiando los datos. El usuario de acceso debe existir ya en Auth con ese correo
-- (Dirección lo invita desde Supabase → Authentication → Users; la función seleccionar-monitora lo automatizará con Resend).
create or replace function public.seleccionar_postulante(p_postulacion uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare p record; d record; u_id uuid;
begin
  if not public.es_direccion() then raise exception 'Solo Dirección puede seleccionar'; end if;
  select * into p from public.postulaciones where id = p_postulacion;
  if p is null then raise exception 'No existe la postulación'; end if;
  if p.etapa = 'seleccionada' then return p.monitora_perfil_id; end if;
  select id into u_id from auth.users where lower(email) = lower(p.correo) limit 1;
  if u_id is null then raise exception 'Primero crea o invita al usuario en Supabase (Authentication → Users) con el correo %', p.correo; end if;
  select * into d from public.postulacion_detalle where postulacion_id = p.id;
  insert into public.perfiles (id, rol, nombre, telefono, correo, fecha_nacimiento, activo) values (u_id, 'monitora', p.nombre_original, p.telefono, p.correo, d.fecha_nacimiento, true)
  on conflict (id) do update set rol = 'monitora', nombre = excluded.nombre, telefono = excluded.telefono, correo = excluded.correo, activo = true;
  insert into public.monitoras (perfil_id, formacion, formacion_otra, tiene_titulo, tiene_cedula, cedula, experiencia, disponibilidad, fecha_ingreso, postulacion_id, estado)
  values (u_id, d.formacion, d.formacion_otra, d.tiene_titulo, d.tiene_cedula, d.cedula, d.experiencia_texto, coalesce(d.disponibilidad, '{}'::jsonb), current_date, p.id, 'activa')
  on conflict (perfil_id) do update set postulacion_id = excluded.postulacion_id, estado = 'activa';
  update public.postulaciones set etapa = 'seleccionada', monitora_perfil_id = u_id where id = p.id;
  insert into public.postulacion_historial (postulacion_id, evento, detalle, por) values (p.id, 'seleccionada', 'Usuario de monitora creado a partir de la postulación', auth.uid());
  return u_id;
end $$;
grant execute on function public.seleccionar_postulante(uuid) to authenticated;
