-- 0005 — Paso F: Academia SHADOW (cursos, lecciones, cuestionarios, progreso, intentos),
-- biblioteca de materiales para monitoras con bandeja de aprobación, recursos para familias,
-- y los buckets de Storage que faltaban (fotos-bitacoras, materiales, academia).
-- Ver docs/01-Arquitectura.md §4.4 y §5.

-- ---------- Academia ----------
create table public.cursos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  orden smallint not null default 1,
  obligatorio boolean not null default false,
  publicado boolean not null default false,
  creado_por uuid references public.perfiles(id),
  creado_en timestamptz not null default now()
);
create table public.lecciones (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references public.cursos(id) on delete cascade,
  titulo text not null,
  tipo text not null default 'video' check (tipo in ('video','documento','enlace','texto')),
  url text,                 -- video (YouTube no listado / Vimeo) o enlace externo
  storage_path text,        -- documento en el bucket academia
  contenido text,           -- lección de texto
  duracion_min smallint,
  orden smallint not null default 1
);
create table public.cuestionarios (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null unique references public.cursos(id) on delete cascade,
  titulo text not null default 'Evaluación del módulo',
  preguntas jsonb not null default '[]'::jsonb,   -- [{ texto, opciones: [..], correcta: índice }]
  minimo_aprobatorio smallint not null default 80
);
create table public.progreso_lecciones (
  perfil_id uuid not null references public.perfiles(id),
  leccion_id uuid not null references public.lecciones(id) on delete cascade,
  completada_en timestamptz not null default now(),
  veces_vista smallint not null default 1,
  primary key (perfil_id, leccion_id)
);
create table public.intentos_cuestionario (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfiles(id),
  cuestionario_id uuid not null references public.cuestionarios(id) on delete cascade,
  respuestas jsonb not null default '[]'::jsonb,  -- índice elegido por pregunta
  aciertos smallint not null,
  total smallint not null,
  porcentaje smallint not null,
  aprobado boolean not null,
  fecha timestamptz not null default now()
);

-- ---------- Materiales (monitoras) y recursos (familias) ----------
create table public.categorias_material (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  audiencia text not null check (audiencia in ('monitoras','familias')),
  padre_id uuid references public.categorias_material(id),
  orden smallint not null default 1,
  activo boolean not null default true
);
create table public.materiales (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid references public.categorias_material(id),
  titulo text not null,
  descripcion text,
  tipo text not null default 'documento' check (tipo in ('documento','video','enlace','imagen')),
  url text,
  storage_path text,
  audiencia text not null check (audiencia in ('monitoras','familias')),
  estado text not null default 'aprobado' check (estado in ('propuesto','aprobado','rechazado','retirado')),
  subido_por uuid references public.perfiles(id),
  aprobado_por uuid references public.perfiles(id),
  aprobado_en timestamptz,
  nota_revision text,
  creado_en timestamptz not null default now()
);
create index materiales_audiencia_estado on public.materiales (audiencia, estado);

-- ---------- RLS ----------
alter table public.cursos enable row level security;
alter table public.lecciones enable row level security;
alter table public.cuestionarios enable row level security;
alter table public.progreso_lecciones enable row level security;
alter table public.intentos_cuestionario enable row level security;
alter table public.categorias_material enable row level security;
alter table public.materiales enable row level security;

create policy cursos_dir on public.cursos for all using (public.es_direccion()) with check (public.es_direccion());
create policy cursos_monitora on public.cursos for select using (publicado and public.mi_rol() = 'monitora');
create policy lecciones_dir on public.lecciones for all using (public.es_direccion()) with check (public.es_direccion());
create policy lecciones_monitora on public.lecciones for select using (public.mi_rol() = 'monitora' and exists (select 1 from public.cursos c where c.id = curso_id and c.publicado));
create policy cuest_dir on public.cuestionarios for all using (public.es_direccion()) with check (public.es_direccion());
create policy cuest_monitora on public.cuestionarios for select using (public.mi_rol() = 'monitora' and exists (select 1 from public.cursos c where c.id = curso_id and c.publicado));
create policy progreso_propio on public.progreso_lecciones for all using (perfil_id = auth.uid()) with check (perfil_id = auth.uid());
create policy progreso_dir on public.progreso_lecciones for select using (public.es_direccion());
create policy intentos_propios_ver on public.intentos_cuestionario for select using (perfil_id = auth.uid() or public.es_direccion());
create policy intentos_propios_crear on public.intentos_cuestionario for insert with check (perfil_id = auth.uid());
create policy categorias_dir on public.categorias_material for all using (public.es_direccion()) with check (public.es_direccion());
create policy categorias_ver on public.categorias_material for select using (
  activo and ((audiencia = 'monitoras' and public.mi_rol() = 'monitora') or (audiencia = 'familias' and public.mi_rol() = 'familia')));
create policy materiales_dir on public.materiales for all using (public.es_direccion()) with check (public.es_direccion());
create policy materiales_monitora_ver on public.materiales for select using (
  public.mi_rol() = 'monitora' and ((audiencia = 'monitoras' and estado = 'aprobado') or subido_por = auth.uid()));
create policy materiales_monitora_proponer on public.materiales for insert with check (
  public.mi_rol() = 'monitora' and subido_por = auth.uid() and estado = 'propuesto' and audiencia = 'monitoras');
create policy materiales_familia_ver on public.materiales for select using (public.mi_rol() = 'familia' and audiencia = 'familias' and estado = 'aprobado');

-- ---------- Storage: buckets privados y sus políticas ----------
insert into storage.buckets (id, name, public) values ('fotos-bitacoras', 'fotos-bitacoras', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('materiales', 'materiales', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('academia', 'academia', false) on conflict (id) do nothing;

-- fotos de bitácora: la monitora de la bitácora sube/borra; lectura para quien puede ver la bitácora (la ruta empieza con el id de la bitácora)
create policy fotos_subir on storage.objects for insert to authenticated with check (
  bucket_id = 'fotos-bitacoras' and (public.es_direccion() or exists (select 1 from public.bitacoras b where b.id::text = split_part(name, '/', 1) and b.monitora_id = auth.uid())));
create policy fotos_borrar on storage.objects for delete to authenticated using (
  bucket_id = 'fotos-bitacoras' and (public.es_direccion() or exists (select 1 from public.bitacoras b where b.id::text = split_part(name, '/', 1) and b.monitora_id = auth.uid())));
create policy fotos_leer on storage.objects for select to authenticated using (
  bucket_id = 'fotos-bitacoras' and exists (select 1 from public.bitacoras b where b.id::text = split_part(name, '/', 1) and public.puede_ver_bitacora(b.estudiante_id, b.monitora_id, b.estado)));

-- materiales: Dirección todo; monitoras suben propuestas a propuestas/<su id>/...; lectura según la fila aprobada de la audiencia
create policy materiales_obj_dir on storage.objects for all to authenticated using (bucket_id = 'materiales' and public.es_direccion()) with check (bucket_id = 'materiales' and public.es_direccion());
create policy materiales_obj_proponer on storage.objects for insert to authenticated with check (
  bucket_id = 'materiales' and public.mi_rol() = 'monitora' and split_part(name, '/', 1) = 'propuestas' and split_part(name, '/', 2) = auth.uid()::text);
create policy materiales_obj_leer on storage.objects for select to authenticated using (
  bucket_id = 'materiales' and exists (select 1 from public.materiales m where m.storage_path = name and (
    (m.estado = 'aprobado' and m.audiencia = 'monitoras' and public.mi_rol() = 'monitora') or
    (m.estado = 'aprobado' and m.audiencia = 'familias' and public.mi_rol() = 'familia') or
    m.subido_por = auth.uid())));

-- academia: Dirección sube; monitoras leen documentos de cursos publicados (la ruta empieza con el id del curso)
create policy academia_obj_dir on storage.objects for all to authenticated using (bucket_id = 'academia' and public.es_direccion()) with check (bucket_id = 'academia' and public.es_direccion());
create policy academia_obj_leer on storage.objects for select to authenticated using (
  bucket_id = 'academia' and public.mi_rol() = 'monitora' and exists (select 1 from public.cursos c where c.id::text = split_part(name, '/', 1) and c.publicado));

-- ---------- catálogo: tipos de material (editable desde Dirección) ----------
insert into public.catalogos (tipo, clave, etiqueta, orden) values
  ('tipo_material','documento','Documento (PDF, Word, presentación)',1),
  ('tipo_material','video','Video (YouTube no listado o Vimeo)',2),
  ('tipo_material','enlace','Enlace externo',3),
  ('tipo_material','imagen','Imagen o apoyo visual',4)
on conflict (tipo, clave) do nothing;
