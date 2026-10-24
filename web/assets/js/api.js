/* SIGAE — capa de datos. Todas las pantallas hablan con la base a través de aquí.
   Sin "embeds" de PostgREST a propósito: las uniones se hacen en JS para que la base falsa y la real se comporten igual. */
import { db } from './supabase.js';
import { hoyIso, sumarDias } from './ui.js';

const ok = r => { if (r.error) { console.error(r.error); throw new Error(r.error.message || 'Error de base de datos'); } return r.data; };
const porId = arr => Object.fromEntries((arr || []).map(x => [x.id, x]));

/* ---------- catálogos (con caché) ---------- */
let _cat = null;
export async function catalogos() {
  if (_cat) return _cat;
  const rows = ok(await db.from('catalogos').select('*').eq('activo', true).order('orden'));
  _cat = {}; rows.forEach(r => { (_cat[r.tipo] ||= []).push(r); });
  _cat._etiqueta = (tipo, clave) => (_cat[tipo] || []).find(x => x.clave === clave)?.etiqueta || clave || '—';
  return _cat;
}
export const limpiarCacheCatalogos = () => { _cat = null; };
export async function todosCatalogos() { return ok(await db.from('catalogos').select('*').order('tipo').order('orden')); }
export async function guardarCatalogo(fila) { return ok(await db.from('catalogos').upsert(fila, { onConflict: 'tipo,clave' }).select()); }

/* ---------- núcleo ---------- */
export async function perfiles(rol) { let q = db.from('perfiles').select('*').eq('activo', true).order('nombre'); if (rol) q = q.eq('rol', rol); return ok(await q); }
export async function perfil(id) { return ok(await db.from('perfiles').select('*').eq('id', id).maybeSingle()); }
export async function estudiantes() { return ok(await db.from('estudiantes').select('*').eq('activo', true).order('nombre')); }
export async function estudiante(id) { return ok(await db.from('estudiantes').select('*').eq('id', id).maybeSingle()); }
export async function guardarEstudiante(e) { return ok(await db.from('estudiantes').upsert(e).select().single()); }
export async function familia(id) { return ok(await db.from('familias').select('*').eq('id', id).maybeSingle()); }
export async function familias() { return ok(await db.from('familias').select('*').order('nombre_familia')); }
export async function tutoresDe(familiaId) {
  const rel = ok(await db.from('familia_tutores').select('*').eq('familia_id', familiaId)); if (!rel.length) return [];
  const ps = ok(await db.from('perfiles').select('*').in('id', rel.map(r => r.perfil_id)));
  return rel.map(r => ({ ...ps.find(p => p.id === r.perfil_id), parentesco: r.parentesco })).filter(x => x.id);
}
export async function familiaDePerfil(perfilId) {
  const rel = ok(await db.from('familia_tutores').select('*').eq('perfil_id', perfilId)); if (!rel.length) return null;
  return familia(rel[0].familia_id);
}
export async function monitora(perfilId) { const [p, m] = await Promise.all([perfil(perfilId), db.from('monitoras').select('*').eq('perfil_id', perfilId).maybeSingle()]); return p ? { ...p, ...(m.data || {}) } : null; }
export async function monitoras() {
  const [ps, ms] = await Promise.all([perfiles('monitora'), db.from('monitoras').select('*')]);
  const m = Object.fromEntries((ms.data || []).map(x => [x.perfil_id, x]));
  return ps.map(p => ({ ...p, ...(m[p.id] || {}) }));
}
export async function asignacionesActivas() { return ok(await db.from('asignaciones').select('*').eq('activa', true)); }
export async function asignacionesDe(estId) { return ok(await db.from('asignaciones').select('*').eq('estudiante_id', estId).order('fecha_inicio', { ascending: false })); }
export async function asignacionActiva(estId) { return ok(await db.from('asignaciones').select('*').eq('estudiante_id', estId).eq('activa', true).maybeSingle()); }
export async function estudiantesDeMonitora(perfilId) {
  const as = ok(await db.from('asignaciones').select('*').eq('monitora_id', perfilId).eq('activa', true)); if (!as.length) return [];
  const es = ok(await db.from('estudiantes').select('*').in('id', as.map(a => a.estudiante_id)).eq('activo', true));
  return es.map(e => ({ ...e, asignacion: as.find(a => a.estudiante_id === e.id) }));
}
export async function estudiantesDeFamilia(perfilId) {
  const fam = await familiaDePerfil(perfilId); if (!fam) return [];
  const es = ok(await db.from('estudiantes').select('*').eq('familia_id', fam.id).eq('activo', true).order('nombre'));
  return es.map(e => ({ ...e, familia: fam }));
}
export async function cambiarMonitora(estId, monitoraId, motivo) { return ok(await db.rpc('cambiar_monitora', { p_estudiante: estId, p_monitora: monitoraId, p_motivo: motivo || null })); }

/** Vista enriquecida para Dirección: estudiante + familia + monitora activa. */
export async function panoramaEstudiantes() {
  const [es, fs, as, ms] = await Promise.all([estudiantes(), familias(), asignacionesActivas(), monitoras()]);
  const F = porId(fs), M = porId(ms);
  return es.map(e => { const a = as.find(x => x.estudiante_id === e.id); return { ...e, familia: F[e.familia_id] || null, asignacion: a || null, monitora: a ? M[a.monitora_id] || null : null }; });
}

/* ---------- bitácoras ---------- */
export async function bitacora(id) { return ok(await db.from('bitacoras').select('*').eq('id', id).maybeSingle()); }
export async function bitacoraDe(estId, fechaIso) { return ok(await db.from('bitacoras').select('*').eq('estudiante_id', estId).eq('fecha_jornada', fechaIso).maybeSingle()); }
export async function bitacorasDe(estId, { desde, hasta, limite = 60 } = {}) { let q = db.from('bitacoras').select('*').eq('estudiante_id', estId).order('fecha_jornada', { ascending: false }).limit(limite); if (desde) q = q.gte('fecha_jornada', desde); if (hasta) q = q.lte('fecha_jornada', hasta); return ok(await q); }
export async function bitacorasDeMonitora(perfilId, { desde, limite = 90 } = {}) { let q = db.from('bitacoras').select('*').eq('monitora_id', perfilId).order('fecha_jornada', { ascending: false }).limit(limite); if (desde) q = q.gte('fecha_jornada', desde); return ok(await q); }
export async function bitacorasEntre(desde, hasta) { return ok(await db.from('bitacoras').select('*').gte('fecha_jornada', desde).lte('fecha_jornada', hasta).order('fecha_jornada', { ascending: false })); }
export async function bitacorasPorRevisar() { return ok(await db.from('bitacoras').select('*').in('estado', ['enviada', 'corregida']).is('revisada_en', null).order('fecha_jornada', { ascending: false })); }
export async function subtablas(bitId, { conConfidencial = false } = {}) {
  const [banos, bloques, fotos, sentir] = await Promise.all([
    db.from('bitacora_banos').select('*').eq('bitacora_id', bitId).order('hora_aprox'),
    db.from('bitacora_bloques').select('*').eq('bitacora_id', bitId).order('hora_inicio'),
    db.from('bitacora_fotos').select('*').eq('bitacora_id', bitId).order('creado_en'),
    conConfidencial ? db.from('bitacora_sentir_monitora').select('*').eq('bitacora_id', bitId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return { banos: banos.data || [], bloques: bloques.data || [], fotos: fotos.data || [], sentir: sentir.data || null };
}
export async function guardarBitacora(b) { return ok(await db.from('bitacoras').upsert(b, { onConflict: 'estudiante_id,fecha_jornada' }).select().single()); }
export async function guardarBloques(bitId, bloques) {
  ok(await db.from('bitacora_bloques').delete().eq('bitacora_id', bitId));
  if (bloques.length) ok(await db.from('bitacora_bloques').insert(bloques.map(x => ({ bitacora_id: bitId, hora_inicio: x.hora_inicio, hora_fin: x.hora_fin, valor: x.valor || null, nota: x.nota || null }))));
}
export async function guardarBanos(bitId, banos) {
  ok(await db.from('bitacora_banos').delete().eq('bitacora_id', bitId));
  if (banos.length) ok(await db.from('bitacora_banos').insert(banos.map(x => ({ bitacora_id: bitId, hora_aprox: x.hora_aprox || null, que_hizo: x.que_hizo || null, nota: x.nota || null }))));
}
export async function guardarSentir(bitId, s) { return ok(await db.from('bitacora_sentir_monitora').upsert({ bitacora_id: bitId, sentimientos: s.sentimientos || [], otro: s.otro || null, comentario: s.comentario || null, actualizado_en: new Date().toISOString() }, { onConflict: 'bitacora_id' }).select()); }
export async function subirFoto(bitId, perfilId, file) {
  const path = `${bitId}/${Date.now()}-${(file.name || 'foto').replace(/[^a-z0-9.\-_]/gi, '_')}`;
  ok(await db.storage.from('fotos-bitacoras').upload(path, file));
  return ok(await db.from('bitacora_fotos').insert({ bitacora_id: bitId, storage_path: path, subida_por: perfilId }).select().single());
}
export async function urlFoto(path) { const r = await db.storage.from('fotos-bitacoras').createSignedUrl(path, 3600); return r.data?.signedUrl || ''; }
export async function borrarFoto(f) { await db.storage.from('fotos-bitacoras').remove([f.storage_path]); ok(await db.from('bitacora_fotos').delete().eq('id', f.id)); }
export async function revisarBitacora(id, { estado, observacion, revisadaPor }) {
  const cambios = { revisada_por: revisadaPor, revisada_en: new Date().toISOString(), observacion_direccion: observacion || null };
  if (estado) cambios.estado = estado;
  return ok(await db.from('bitacoras').update(cambios).eq('id', id).select().single());
}
export async function registrarLectura(bitId, perfilId) { try { await db.from('bitacora_lecturas').upsert({ bitacora_id: bitId, perfil_id: perfilId, leida_en: new Date().toISOString() }, { onConflict: 'bitacora_id,perfil_id' }); } catch (e) {} }
export async function lecturasDe(bitIds) { if (!bitIds.length) return []; return ok(await db.from('bitacora_lecturas').select('*').in('bitacora_id', bitIds)); }
export async function sentirDeMonitora(perfilId, desde) {
  const bs = await bitacorasDeMonitora(perfilId, { desde }); if (!bs.length) return [];
  const s = ok(await db.from('bitacora_sentir_monitora').select('*').in('bitacora_id', bs.map(b => b.id)));
  return bs.map(b => ({ fecha: b.fecha_jornada, estudiante_id: b.estudiante_id, ...(s.find(x => x.bitacora_id === b.id) || { sentimientos: [] }) }));
}

/* ---------- seguimiento ---------- */
export async function objetivosDe(estId) { return ok(await db.from('objetivos').select('*').eq('estudiante_id', estId).order('prioridad')); }
export async function evaluacionesDe(estId) { return ok(await db.from('evaluaciones').select('*').eq('estudiante_id', estId).order('fecha')); }
export async function evaluacionesTodas() { return ok(await db.from('evaluaciones').select('*').order('fecha')); }
export async function pagosDe(familiaId) { return ok(await db.from('pagos').select('*').eq('familia_id', familiaId).order('fecha_vencimiento')); }
export async function proximoPago(familiaId) {
  const ps = await pagosDe(familiaId); const hoy = hoyIso();
  const vencido = ps.find(p => p.estado === 'vencido' || (p.estado === 'pendiente' && p.fecha_vencimiento < hoy));
  if (vencido) return { ...vencido, estado: 'vencido' };
  return ps.find(p => p.estado === 'pendiente' && p.fecha_vencimiento >= hoy) || null;
}
export async function tareas() { return ok(await db.from('tareas').select('*').eq('estado', 'pendiente').order('fecha')); }
export async function guardarTarea(t) { return ok(await db.from('tareas').upsert(t).select().single()); }
export async function solicitudesAbiertas() { return ok(await db.from('solicitudes').select('*').in('estado', ['recibida', 'en_revision', 'info_adicional', 'aprobada_en_proceso']).order('creado_en', { ascending: false })); }
export async function solicitudesDe(perfilId) { return ok(await db.from('solicitudes').select('*').eq('solicitante_id', perfilId).order('creado_en', { ascending: false })); }
export async function accesosDe(perfilIds, desde) { if (!perfilIds.length) return []; return ok(await db.from('accesos_sesion').select('*').in('perfil_id', perfilIds).gte('fecha_hora', desde)); }

/* ---------- cálculos compartidos ---------- */
/** Días hábiles del estudiante entre dos fechas (según dias_asistencia). */
export function diasHabiles(est, desde, hasta) {
  const out = []; const dias = est.dias_asistencia?.length ? est.dias_asistencia : [1, 2, 3, 4, 5];
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) { const dow = new Date(f + 'T12:00:00').getDay() || 7; if (dias.includes(dow)) out.push(f); }
  return out;
}
/** Bloques de 30 minutos del horario escolar; marca el recreo como no aplica. */
export function bloquesDelHorario(est) {
  if (!est.hora_entrada || !est.hora_salida) return [];
  const aMin = h => { const [a, b] = h.slice(0, 5).split(':').map(Number); return a * 60 + b; }; const aHora = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const ini = aMin(est.hora_entrada), fin = aMin(est.hora_salida), ri = est.hora_recreo_inicio ? aMin(est.hora_recreo_inicio) : -1, rf = est.hora_recreo_fin ? aMin(est.hora_recreo_fin) : -1;
  const out = []; for (let m = ini; m < fin; m += 30) { const recreo = ri >= 0 && m >= ri && m < rf; out.push({ hora_inicio: aHora(m), hora_fin: aHora(Math.min(m + 30, fin)), recreo, valor: recreo ? 'no_aplica' : null }); }
  return out;
}
