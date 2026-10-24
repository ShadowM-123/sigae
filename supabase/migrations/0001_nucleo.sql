-- 0001 — Núcleo de SIGAE: perfiles, estudiantes, familias, monitoras, asignaciones, catálogos, accesos.
-- Convenciones: español, snake_case, uuid, creado_en/actualizado_en. RLS en todo.
-- Ver docs/01-Arquitectura.md §4.1 y §2.1.

create extension if not exists pgcrypto;

-- ---------- utilidades ----------
create or replace function public.tocar_actualizado_en() returns trigger language plpgsql as $$
begin new.actualizado_en = now(); return new; end $$;

-- ---------- perfiles (espejo de auth.users) ----------
create table public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  rol text not null check (rol in ('direccion','asistente','monitora','familia','especialista')),
  subtipo_especialista text check (subtipo_especialista in ('terapeuta','externo','personal_escolar')),
  nombre text not null,
  telefono text,
  correo text,
  fecha_nacimiento date,
  foto_path text,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create trigger t_perfiles_act before update on public.perfiles for each row execute function public.tocar_actualizado_en();

-- Funciones de apoyo para RLS (security definer para no recursar sobre perfiles)
create or replace function public.mi_rol() returns text language sql stable security definer set search_path = public as $$
  select rol from public.perfiles where id = auth.uid()
$$;
create or replace function public.es_direccion() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select rol in ('direccion','asistente') from public.perfiles where id = auth.uid()), false)
$$;

-- ---------- familias y tutores ----------
create table public.familias (
  id uuid primary key default gen_random_uuid(),
  nombre_familia text not null,
  dia_de_pago smallint check (dia_de_pago between 1 and 31),
  monto_mensual numeric(10,2),
  notas text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create trigger t_familias_act before update on public.familias for each row execute function public.tocar_actualizado_en();

create table public.familia_tutores (
  familia_id uuid not null references public.familias(id) on delete cascade,
  perfil_id uuid not null references public.perfiles(id) on delete cascade,
  parentesco text,
  primary key (familia_id, perfil_id)
);

-- ---------- estudiantes ----------
create table public.estudiantes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  fecha_nacimiento date,
  foto_path text,
  foto_autorizada boolean not null default false,
  escuela text,
  grado text,
  grupo text,
  direccion_escuela text,
  zona text,
  hora_entrada time,
  hora_salida time,
  hora_recreo_inicio time,
  hora_recreo_fin time,
  dias_asistencia smallint[] not null default '{1,2,3,4,5}', -- 1=lunes … 7=domingo
  diagnostico text,
  perfil_desarrollo text,
  necesidades_apoyo text[] not null default '{}',
  dinamica_familiar text,
  companeros_salon int,
  familia_id uuid references public.familias(id),
  activo boolean not null default true,
  fecha_inicio_servicio date,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create trigger t_estudiantes_act before update on public.estudiantes for each row execute function public.tocar_actualizado_en();

-- ---------- monitoras (extiende perfiles) ----------
create table public.monitoras (
  perfil_id uuid primary key references public.perfiles(id) on delete cascade,
  formacion text,
  formacion_otra text,
  tiene_titulo boolean,
  tiene_cedula boolean,
  cedula text,
  experiencia text,
  especialidades text[] not null default '{}',
  zonas text[] not null default '{}',
  disponibilidad jsonb not null default '{}'::jsonb,
  fecha_ingreso date,
  postulacion_id uuid,
  estado text not null default 'activa' check (estado in ('activa','inactiva')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create trigger t_monitoras_act before update on public.monitoras for each row execute function public.tocar_actualizado_en();

-- ---------- asignaciones (historial, una activa por estudiante) ----------
create table public.asignaciones (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references public.estudiantes(id),
  monitora_id uuid not null references public.perfiles(id),
  fecha_inicio date not null default current_date,
  fecha_fin date,
  motivo_cambio text,
  activa boolean not null default true,
  creado_en timestamptz not null default now()
);
create unique index asignaciones_una_activa on public.asignaciones(estudiante_id) where activa;
create index asignaciones_monitora on public.asignaciones(monitora_id) where activa;

-- Funciones de autorización por estudiante
create or replace function public.monitora_de(est uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.asignaciones a where a.estudiante_id = est and a.monitora_id = auth.uid() and a.activa)
$$;
create or replace function public.familia_de(est uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.estudiantes e join public.familia_tutores ft on ft.familia_id = e.familia_id
                 where e.id = est and ft.perfil_id = auth.uid())
$$;

-- Cambio de monitora: cierra la activa y abre la nueva, sin tocar historial.
create or replace function public.cambiar_monitora(p_estudiante uuid, p_monitora uuid, p_motivo text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare nueva uuid;
begin
  if not public.es_direccion() then raise exception 'Solo Dirección puede cambiar la monitora'; end if;
  update public.asignaciones set activa = false, fecha_fin = current_date, motivo_cambio = coalesce(p_motivo, motivo_cambio)
    where estudiante_id = p_estudiante and activa;
  insert into public.asignaciones(estudiante_id, monitora_id) values (p_estudiante, p_monitora) returning id into nueva;
  return nueva;
end $$;

-- ---------- catálogos editables ----------
create table public.catalogos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  clave text not null,
  etiqueta text not null,
  orden int not null default 0,
  activo boolean not null default true,
  unique (tipo, clave)
);

insert into public.catalogos(tipo, clave, etiqueta, orden) values
 ('lonche','si','Sí, comió su lonche',1),('lonche','no','No comió',2),('lonche','parte','Dejó una parte',3),
 ('uso_bano','orino','Orinó',1),('uso_bano','evacuo','Evacuó',2),('uso_bano','ambos','Ambos',3),('uso_bano','intento','Intentó sin resultado',4),('uso_bano','accidente','Accidente',5),('uso_bano','otro','Otro',6),
 ('conducta','ninguna','No se presentaron',1),('conducta','autoagresion','Autoagresión',2),('conducta','agresion_personas','Agresión hacia otras personas',3),('conducta','agresion_objetos','Agresión con objetos',4),
 ('actividades_realizadas','todas','Sí, todas',1),('actividades_realizadas','mayoria','Sí, la mayoría',2),('actividades_realizadas','casi_ninguna','Casi ninguna',3),('actividades_realizadas','ninguna','Ninguna',4),
 ('participacion','todas','En todas',1),('participacion','algunas','En algunas',2),('participacion','ninguna','En ninguna',3),
 ('estado_animo_estudiante','contento','Contento',1),('estado_animo_estudiante','enojado','Enojado',2),('estado_animo_estudiante','triste','Triste',3),('estado_animo_estudiante','cansado','Cansado',4),('estado_animo_estudiante','irritado','Irritado',5),('estado_animo_estudiante','aburrido','Aburrido',6),('estado_animo_estudiante','indiferente','Indiferente',7),('estado_animo_estudiante','otro','Otro',8),
 ('sentir_monitora','comoda','Cómoda',1),('sentir_monitora','activa','Activa',2),('sentir_monitora','contenta','Contenta',3),('sentir_monitora','incomoda','Incómoda',4),('sentir_monitora','animo_bajo','Con ánimo bajo',5),('sentir_monitora','triste','Triste',6),('sentir_monitora','enojada','Enojada',7),('sentir_monitora','cansada','Cansada',8),('sentir_monitora','otra','Otra',9),
 ('valor_bloque','trabajo','Trabajó',1),('valor_bloque','con_apoyo','Trabajó con apoyo',2),('valor_bloque','no_trabajo','No trabajó',3),('valor_bloque','no_aplica','No aplica',4),
 ('formacion_academica','educacion_especial','Educación especial',1),('formacion_academica','educacion','Educación',2),('formacion_academica','puericultura','Técnico en puericultura',3),('formacion_academica','psicologia_general','Lic. en Psicología General',4),('formacion_academica','psicologia_clinica','Lic. en Psicología Clínica',5),('formacion_academica','psicologia_educativa','Lic. en Psicología Educativa',6),('formacion_academica','fisioterapia','Fisioterapia',7),('formacion_academica','medicina','Medicina',8),('formacion_academica','trabajo_social','Trabajo Social',9),('formacion_academica','otra','Otra formación',10),
 ('dimension_evaluacion','atencion','Atención y permanencia',1),('dimension_evaluacion','autonomia','Autonomía',2),('dimension_evaluacion','comunicacion','Comunicación',3),('dimension_evaluacion','regulacion','Regulación emocional',4),('dimension_evaluacion','social','Interacción social',5),('dimension_evaluacion','academico','Desempeño académico',6),
 ('como_se_entero','redes','Redes sociales',1),('como_se_entero','recomendacion','Recomendación',2),('como_se_entero','bolsa','Bolsa de trabajo',3),('como_se_entero','escuela','Por una escuela',4),('como_se_entero','otro','Otro',5);

-- ---------- accesos (para «cuántas veces han entrado») ----------
create table public.accesos_sesion (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfiles(id) on delete cascade,
  fecha_hora timestamptz not null default now(),
  dispositivo text
);

-- ---------- RLS ----------
alter table public.perfiles enable row level security;
alter table public.familias enable row level security;
alter table public.familia_tutores enable row level security;
alter table public.estudiantes enable row level security;
alter table public.monitoras enable row level security;
alter table public.asignaciones enable row level security;
alter table public.catalogos enable row level security;
alter table public.accesos_sesion enable row level security;

-- perfiles: cada quien el suyo; Dirección todos; familia ve el perfil de la monitora de su hijo; monitora ve tutores de su estudiante.
create policy perfiles_propio on public.perfiles for select using (id = auth.uid());
create policy perfiles_direccion on public.perfiles for all using (public.es_direccion()) with check (public.es_direccion());
create policy perfiles_monitora_para_familia on public.perfiles for select using (
  exists (select 1 from public.asignaciones a where a.monitora_id = perfiles.id and a.activa and public.familia_de(a.estudiante_id)));
create policy perfiles_tutores_para_monitora on public.perfiles for select using (
  exists (select 1 from public.familia_tutores ft join public.estudiantes e on e.familia_id = ft.familia_id
          where ft.perfil_id = perfiles.id and public.monitora_de(e.id)));
create policy perfiles_editar_propio on public.perfiles for update using (id = auth.uid()) with check (id = auth.uid() and rol = (select rol from public.perfiles p where p.id = auth.uid()));

-- familias
create policy familias_direccion on public.familias for all using (public.es_direccion()) with check (public.es_direccion());
create policy familias_propia on public.familias for select using (exists (select 1 from public.familia_tutores ft where ft.familia_id = familias.id and ft.perfil_id = auth.uid()));
create policy familias_monitora on public.familias for select using (exists (select 1 from public.estudiantes e where e.familia_id = familias.id and public.monitora_de(e.id)));
create policy tutores_direccion on public.familia_tutores for all using (public.es_direccion()) with check (public.es_direccion());
create policy tutores_propios on public.familia_tutores for select using (perfil_id = auth.uid() or exists (select 1 from public.familia_tutores f2 where f2.familia_id = familia_tutores.familia_id and f2.perfil_id = auth.uid()));

-- estudiantes
create policy estudiantes_direccion on public.estudiantes for all using (public.es_direccion()) with check (public.es_direccion());
create policy estudiantes_monitora on public.estudiantes for select using (public.monitora_de(id));
create policy estudiantes_familia on public.estudiantes for select using (public.familia_de(id));

-- monitoras
create policy monitoras_direccion on public.monitoras for all using (public.es_direccion()) with check (public.es_direccion());
create policy monitoras_propia on public.monitoras for select using (perfil_id = auth.uid());
create policy monitoras_familia on public.monitoras for select using (
  exists (select 1 from public.asignaciones a where a.monitora_id = monitoras.perfil_id and a.activa and public.familia_de(a.estudiante_id)));

-- asignaciones
create policy asignaciones_direccion on public.asignaciones for all using (public.es_direccion()) with check (public.es_direccion());
create policy asignaciones_monitora on public.asignaciones for select using (monitora_id = auth.uid());
create policy asignaciones_familia on public.asignaciones for select using (public.familia_de(estudiante_id));

-- catálogos: todos leen; Dirección edita
create policy catalogos_leer on public.catalogos for select using (auth.uid() is not null);
create policy catalogos_direccion on public.catalogos for all using (public.es_direccion()) with check (public.es_direccion());

-- accesos
create policy accesos_insertar on public.accesos_sesion for insert with check (perfil_id = auth.uid());
create policy accesos_direccion on public.accesos_sesion for select using (public.es_direccion() or perfil_id = auth.uid());
