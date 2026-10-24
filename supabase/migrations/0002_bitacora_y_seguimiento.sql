-- 0002 — Bitácora diaria y seguimiento básico (pagos, ciclos, objetivos, evaluaciones, tareas, solicitudes, notificaciones).
-- Ver docs/01-Arquitectura.md §4.2 y §4.3.

-- ---------- bitácoras ----------
create table public.bitacoras (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references public.estudiantes(id),
  monitora_id uuid not null references public.perfiles(id),
  asignacion_id uuid references public.asignaciones(id),
  fecha_jornada date not null,
  enviada_en timestamptz,
  estado text not null default 'borrador' check (estado in ('borrador','enviada','requiere_correccion','corregida')),
  valoracion_dia smallint check (valoracion_dia between 1 and 5),
  hay_tareas boolean,
  tareas_pendientes text,
  lonche text,
  fue_al_bano boolean,
  conductas text[] not null default '{}',
  conducta_detalle jsonb,            -- {antes, que_hizo, despues, respuesta}
  habilidades_sociales boolean,
  habilidades_detalle text,
  actividades_realizadas text,
  participacion text,
  estados_animo text[] not null default '{}',
  estado_animo_otro text,
  resumen_narrativo text,
  comentarios_adicionales text,
  paso_actual smallint not null default 0,
  revisada_por uuid references public.perfiles(id),
  revisada_en timestamptz,
  observacion_direccion text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (estudiante_id, fecha_jornada)
);
create trigger t_bitacoras_act before update on public.bitacoras for each row execute function public.tocar_actualizado_en();
create index bitacoras_fecha on public.bitacoras(fecha_jornada desc);
create index bitacoras_monitora on public.bitacoras(monitora_id, fecha_jornada desc);

create table public.bitacora_banos (
  id uuid primary key default gen_random_uuid(),
  bitacora_id uuid not null references public.bitacoras(id) on delete cascade,
  hora_aprox time,
  que_hizo text,
  nota text
);
create table public.bitacora_bloques (
  id uuid primary key default gen_random_uuid(),
  bitacora_id uuid not null references public.bitacoras(id) on delete cascade,
  hora_inicio time not null,
  hora_fin time not null,
  valor text,
  nota text,
  unique (bitacora_id, hora_inicio)
);
create table public.bitacora_fotos (
  id uuid primary key default gen_random_uuid(),
  bitacora_id uuid not null references public.bitacoras(id) on delete cascade,
  storage_path text not null,
  descripcion text,
  subida_por uuid references public.perfiles(id),
  creado_en timestamptz not null default now()
);
-- CONFIDENCIAL: solo la monitora dueña y Dirección. Nunca en vistas de familia/especialista ni en descargas.
create table public.bitacora_sentir_monitora (
  bitacora_id uuid primary key references public.bitacoras(id) on delete cascade,
  sentimientos text[] not null default '{}',
  otro text,
  comentario text,
  actualizado_en timestamptz not null default now()
);
create table public.bitacora_lecturas (
  bitacora_id uuid not null references public.bitacoras(id) on delete cascade,
  perfil_id uuid not null references public.perfiles(id) on delete cascade,
  leida_en timestamptz not null default now(),
  primary key (bitacora_id, perfil_id)
);

-- ---------- seguimiento ----------
create table public.ciclos (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references public.estudiantes(id),
  nombre text not null,
  fecha_inicio date not null,
  fecha_fin date,
  activo boolean not null default true
);
create table public.objetivos (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references public.estudiantes(id),
  ciclo_id uuid references public.ciclos(id),
  descripcion text not null,
  estrategia text,
  estado text not null default 'en_proceso' check (estado in ('en_proceso','alcanzado','pausado')),
  prioridad smallint not null default 2,
  visible_monitora boolean not null default true,
  visible_familia boolean not null default true,
  creado_en timestamptz not null default now()
);
create table public.evaluaciones (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references public.estudiantes(id),
  ciclo_id uuid references public.ciclos(id),
  tipo text not null check (tipo in ('diagnostica','intermedia','final')),
  fecha date,                       -- null = pendiente de programar
  realizada boolean not null default false,
  aplicada_por uuid references public.perfiles(id),
  resultados jsonb not null default '{}'::jsonb,
  observaciones text,
  archivo_path text,
  visible_monitora boolean not null default true,
  visible_familia boolean not null default false,
  creado_en timestamptz not null default now()
);
create table public.pagos (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references public.familias(id),
  fecha_vencimiento date not null,
  monto numeric(10,2),
  estado text not null default 'pendiente' check (estado in ('pendiente','pagado','vencido')),
  pagado_en date,
  nota text
);
create table public.tareas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo text not null default 'general',   -- general · visita_escolar · revision · reunion
  fecha date,
  estudiante_id uuid references public.estudiantes(id),
  estado text not null default 'pendiente' check (estado in ('pendiente','hecha')),
  notas text,
  creado_en timestamptz not null default now()
);
create table public.solicitudes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('reporte_familia','reporte_especialista','visita_escolar')),
  estudiante_id uuid not null references public.estudiantes(id),
  solicitante_id uuid not null references public.perfiles(id),
  datos jsonb not null default '{}'::jsonb,
  estado text not null default 'recibida' check (estado in ('recibida','en_revision','info_adicional','aprobada_en_proceso','atendida','no_autorizada')),
  respuesta_direccion text,
  archivo_path text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create trigger t_solicitudes_act before update on public.solicitudes for each row execute function public.tocar_actualizado_en();
create table public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfiles(id) on delete cascade,
  tipo text not null,
  titulo text not null,
  cuerpo text,
  fecha date not null default current_date,
  enlace text,
  leida_en timestamptz,
  creado_en timestamptz not null default now()
);

-- ---------- RLS ----------
alter table public.bitacoras enable row level security;
alter table public.bitacora_banos enable row level security;
alter table public.bitacora_bloques enable row level security;
alter table public.bitacora_fotos enable row level security;
alter table public.bitacora_sentir_monitora enable row level security;
alter table public.bitacora_lecturas enable row level security;
alter table public.ciclos enable row level security;
alter table public.objetivos enable row level security;
alter table public.evaluaciones enable row level security;
alter table public.pagos enable row level security;
alter table public.tareas enable row level security;
alter table public.solicitudes enable row level security;
alter table public.notificaciones enable row level security;

-- ¿Puede el usuario actual ver esta bitácora? (sin la sección confidencial)
create or replace function public.puede_ver_bitacora(b_est uuid, b_moni uuid, b_estado text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.es_direccion()
      or b_moni = auth.uid()
      or (public.familia_de(b_est) and b_estado <> 'borrador')
$$;

create policy bit_ver on public.bitacoras for select using (public.puede_ver_bitacora(estudiante_id, monitora_id, estado));
create policy bit_crear on public.bitacoras for insert with check (monitora_id = auth.uid() and public.monitora_de(estudiante_id));
create policy bit_editar_monitora on public.bitacoras for update
  using (monitora_id = auth.uid() and estado in ('borrador','requiere_correccion'))
  with check (monitora_id = auth.uid());
create policy bit_direccion on public.bitacoras for all using (public.es_direccion()) with check (public.es_direccion());

-- subtablas: heredan de la bitácora
create policy banos_ver on public.bitacora_banos for select using (exists (select 1 from public.bitacoras b where b.id = bitacora_id and public.puede_ver_bitacora(b.estudiante_id, b.monitora_id, b.estado)));
create policy banos_editar on public.bitacora_banos for all using (exists (select 1 from public.bitacoras b where b.id = bitacora_id and (b.monitora_id = auth.uid() or public.es_direccion())))
  with check (exists (select 1 from public.bitacoras b where b.id = bitacora_id and (b.monitora_id = auth.uid() or public.es_direccion())));
create policy bloques_ver on public.bitacora_bloques for select using (exists (select 1 from public.bitacoras b where b.id = bitacora_id and public.puede_ver_bitacora(b.estudiante_id, b.monitora_id, b.estado)));
create policy bloques_editar on public.bitacora_bloques for all using (exists (select 1 from public.bitacoras b where b.id = bitacora_id and (b.monitora_id = auth.uid() or public.es_direccion())))
  with check (exists (select 1 from public.bitacoras b where b.id = bitacora_id and (b.monitora_id = auth.uid() or public.es_direccion())));
create policy fotos_ver on public.bitacora_fotos for select using (exists (select 1 from public.bitacoras b where b.id = bitacora_id and public.puede_ver_bitacora(b.estudiante_id, b.monitora_id, b.estado)));
create policy fotos_editar on public.bitacora_fotos for all using (exists (select 1 from public.bitacoras b where b.id = bitacora_id and (b.monitora_id = auth.uid() or public.es_direccion())))
  with check (exists (select 1 from public.bitacoras b where b.id = bitacora_id and (b.monitora_id = auth.uid() or public.es_direccion())));

-- CONFIDENCIAL: solo la monitora dueña y Dirección. La familia NO entra aquí aunque vea la bitácora.
create policy sentir_monitora on public.bitacora_sentir_monitora for all
  using (exists (select 1 from public.bitacoras b where b.id = bitacora_id and b.monitora_id = auth.uid()))
  with check (exists (select 1 from public.bitacoras b where b.id = bitacora_id and b.monitora_id = auth.uid()));
create policy sentir_direccion on public.bitacora_sentir_monitora for select using (public.es_direccion());

create policy lecturas_insertar on public.bitacora_lecturas for insert with check (perfil_id = auth.uid());
create policy lecturas_ver on public.bitacora_lecturas for select using (perfil_id = auth.uid() or public.es_direccion());

-- seguimiento
create policy ciclos_dir on public.ciclos for all using (public.es_direccion()) with check (public.es_direccion());
create policy ciclos_ver on public.ciclos for select using (public.monitora_de(estudiante_id) or public.familia_de(estudiante_id));
create policy objetivos_dir on public.objetivos for all using (public.es_direccion()) with check (public.es_direccion());
create policy objetivos_ver on public.objetivos for select using ((public.monitora_de(estudiante_id) and visible_monitora) or (public.familia_de(estudiante_id) and visible_familia));
create policy evaluaciones_dir on public.evaluaciones for all using (public.es_direccion()) with check (public.es_direccion());
create policy evaluaciones_ver on public.evaluaciones for select using ((public.monitora_de(estudiante_id) and visible_monitora) or (public.familia_de(estudiante_id) and visible_familia));
create policy pagos_dir on public.pagos for all using (public.es_direccion()) with check (public.es_direccion());
create policy pagos_familia on public.pagos for select using (exists (select 1 from public.familia_tutores ft where ft.familia_id = pagos.familia_id and ft.perfil_id = auth.uid()));
create policy tareas_dir on public.tareas for all using (public.es_direccion()) with check (public.es_direccion());
create policy solicitudes_dir on public.solicitudes for all using (public.es_direccion()) with check (public.es_direccion());
create policy solicitudes_propias on public.solicitudes for select using (solicitante_id = auth.uid());
create policy solicitudes_crear on public.solicitudes for insert with check (solicitante_id = auth.uid() and public.familia_de(estudiante_id));
create policy notif_propias on public.notificaciones for select using (perfil_id = auth.uid());
create policy notif_marcar on public.notificaciones for update using (perfil_id = auth.uid()) with check (perfil_id = auth.uid());
create policy notif_dir on public.notificaciones for all using (public.es_direccion()) with check (public.es_direccion());
