-- 0003 — Paso C: calendario (eventos manuales), red de apoyo del estudiante (especialistas) y citas.
-- Ver docs/01-Arquitectura.md §4.3.

create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'general',   -- general · visita_escolar · reunion · entrevista · capacitacion
  titulo text not null,
  fecha date not null,
  hora time,
  lugar text,
  estudiante_id uuid references public.estudiantes(id),
  monitora_id uuid references public.perfiles(id),
  notas text,
  creado_por uuid references public.perfiles(id),
  creado_en timestamptz not null default now()
);

-- Red de apoyo: terapeutas, especialistas externos y personal escolar vinculados a un estudiante (con o sin cuenta en SIGAE).
create table public.especialistas_estudiante (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references public.estudiantes(id),
  nombre text not null,
  especialidad text,
  tipo text not null default 'terapeuta' check (tipo in ('terapeuta','externo','personal_escolar')),
  contacto text,
  lugar text,
  dias_horarios text,
  perfil_id uuid references public.perfiles(id),   -- si tiene cuenta (módulo de especialistas)
  registrado_por uuid references public.perfiles(id),
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create trigger t_esp_act before update on public.especialistas_estudiante for each row execute function public.tocar_actualizado_en();

create table public.citas (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references public.estudiantes(id),
  especialista_id uuid references public.especialistas_estudiante(id),
  especialista_nombre text,          -- por si la cita es con alguien no registrado
  especialidad text,
  fecha date not null,
  hora time,
  lugar_modalidad text,
  observaciones text,
  creada_por uuid references public.perfiles(id),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create trigger t_citas_act before update on public.citas for each row execute function public.tocar_actualizado_en();
create index citas_fecha on public.citas(estudiante_id, fecha);

-- Historial de cambios de estado de las solicitudes
create table public.solicitud_historial (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null references public.solicitudes(id) on delete cascade,
  estado text not null,
  nota text,
  por uuid references public.perfiles(id),
  fecha timestamptz not null default now()
);

-- ---------- RLS ----------
alter table public.eventos enable row level security;
alter table public.especialistas_estudiante enable row level security;
alter table public.citas enable row level security;
alter table public.solicitud_historial enable row level security;

create policy eventos_dir on public.eventos for all using (public.es_direccion()) with check (public.es_direccion());
create policy eventos_monitora on public.eventos for select using (monitora_id = auth.uid() or (estudiante_id is not null and public.monitora_de(estudiante_id)));

create policy esp_dir on public.especialistas_estudiante for all using (public.es_direccion()) with check (public.es_direccion());
create policy esp_familia on public.especialistas_estudiante for all using (public.familia_de(estudiante_id)) with check (public.familia_de(estudiante_id));
create policy esp_monitora on public.especialistas_estudiante for select using (public.monitora_de(estudiante_id));

create policy citas_dir on public.citas for all using (public.es_direccion()) with check (public.es_direccion());
create policy citas_familia on public.citas for all using (public.familia_de(estudiante_id)) with check (public.familia_de(estudiante_id));
create policy citas_monitora on public.citas for select using (public.monitora_de(estudiante_id));

create policy sol_hist_dir on public.solicitud_historial for all using (public.es_direccion()) with check (public.es_direccion());
create policy sol_hist_propio on public.solicitud_historial for select using (exists (select 1 from public.solicitudes s where s.id = solicitud_id and s.solicitante_id = auth.uid()));

-- La familia también puede actualizar sus propias solicitudes mientras estén recibidas (p. ej. agregar información)
create policy solicitudes_editar_propias on public.solicitudes for update using (solicitante_id = auth.uid() and estado in ('recibida','info_adicional')) with check (solicitante_id = auth.uid());
