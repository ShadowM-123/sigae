-- 0006 — Paso G: especialistas y personal escolar con cuenta.
-- Acceso de solo consulta al estudiante autorizado (datos básicos, monitora y, si Dirección lo autoriza, bitácoras),
-- y solicitudes de visita escolar y de reporte que llegan a Dirección como pendientes. Nunca descargas ni edición.
-- Ver docs/01-Arquitectura.md §2 (matriz de permisos) y §5 (flujos).

alter table public.especialistas_estudiante
  add column if not exists correo text,
  add column if not exists puede_ver_bitacoras boolean not null default false,
  add column if not exists autorizado_por uuid references public.perfiles(id),
  add column if not exists autorizado_en timestamptz;

-- ¿La persona con sesión es especialista autorizado de este estudiante?
create or replace function public.especialista_de(est uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.especialistas_estudiante x where x.estudiante_id = est and x.perfil_id = auth.uid() and x.activo)
$$;
-- ¿…y además Dirección le autorizó leer las bitácoras?
create or replace function public.especialista_ve_bitacoras(est uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.especialistas_estudiante x where x.estudiante_id = est and x.perfil_id = auth.uid() and x.activo and x.puede_ver_bitacoras)
$$;

-- La regla central de lectura de bitácoras incluye ahora al especialista autorizado (nunca borradores; la sección confidencial tiene su propia tabla y política).
create or replace function public.puede_ver_bitacora(b_est uuid, b_moni uuid, b_estado text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.es_direccion()
      or b_moni = auth.uid()
      or (public.familia_de(b_est) and b_estado <> 'borrador')
      or (public.especialista_ve_bitacoras(b_est) and b_estado <> 'borrador')
$$;

-- Lo mínimo para identificar el caso: estudiante, asignación activa y nombre de la monitora. Nada más.
create policy estudiantes_especialista on public.estudiantes for select using (public.especialista_de(id));
create policy asignaciones_especialista on public.asignaciones for select using (activa and public.especialista_de(estudiante_id));
create policy perfiles_monitora_para_especialista on public.perfiles for select using (
  rol = 'monitora' and exists (select 1 from public.asignaciones a where a.monitora_id = perfiles.id and a.activa and public.especialista_de(a.estudiante_id)));
create policy esp_propio on public.especialistas_estudiante for select using (perfil_id = auth.uid());

-- Solicitudes del especialista: visita escolar o reporte, solo sobre sus estudiantes autorizados.
create policy solicitudes_crear_especialista on public.solicitudes for insert with check (
  solicitante_id = auth.uid() and public.mi_rol() = 'especialista' and public.especialista_de(estudiante_id) and tipo in ('reporte_especialista','visita_escolar'));
create policy sol_hist_crear_propio on public.solicitud_historial for insert with check (
  exists (select 1 from public.solicitudes s where s.id = solicitud_id and s.solicitante_id = auth.uid()));
