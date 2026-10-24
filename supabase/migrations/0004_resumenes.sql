-- 0004 — Paso D: resúmenes semanales y mensuales generados desde las bitácoras.
-- El contenido nunca incluye la sección confidencial de la monitora (el generador no la lee).
-- Ver docs/01-Arquitectura.md §4.3 y §5.3.

create table public.resumenes (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references public.estudiantes(id),
  tipo text not null check (tipo in ('semanal','mensual')),
  periodo_inicio date not null,
  periodo_fin date not null,
  contenido jsonb not null default '{}'::jsonb,   -- { metricas:{…}, secciones:{ relevantes:[], avances:[], dificultades:[], objetivos:[], seguimiento:[] } }
  generado_automaticamente boolean not null default true,
  generado_en timestamptz not null default now(),
  revisado_por uuid references public.perfiles(id),
  revisado_en timestamptz,
  estado text not null default 'borrador' check (estado in ('borrador','publicado')),
  publicado_en timestamptz,
  pdf_path text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (estudiante_id, tipo, periodo_inicio)
);
create trigger t_resumenes_act before update on public.resumenes for each row execute function public.tocar_actualizado_en();
create index resumenes_est on public.resumenes(estudiante_id, periodo_inicio desc);

alter table public.resumenes enable row level security;
create policy resumenes_dir on public.resumenes for all using (public.es_direccion()) with check (public.es_direccion());
-- La monitora ve los de su estudiante y puede crear/actualizar borradores (no publicar).
create policy resumenes_monitora_ver on public.resumenes for select using (public.monitora_de(estudiante_id));
create policy resumenes_monitora_borrador on public.resumenes for insert with check (public.monitora_de(estudiante_id) and estado = 'borrador');
create policy resumenes_monitora_editar on public.resumenes for update using (public.monitora_de(estudiante_id) and estado = 'borrador') with check (estado = 'borrador');
-- La familia solo ve los publicados.
create policy resumenes_familia on public.resumenes for select using (public.familia_de(estudiante_id) and estado = 'publicado');
