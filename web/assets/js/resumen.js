/* SIGAE — resúmenes semanales y mensuales generados desde las bitácoras.
   Versión 1 con reglas (sin IA): cuenta, compara y redacta frases a partir de las respuestas estructuradas y los resúmenes narrativos.
   NUNCA lee la sección confidencial «¿Cómo me sentí como monitora?». El resultado es un borrador revisable: no sustituye la valoración profesional. */
import * as api from './api.js';
import { esc, fecha, fechaLarga, hoyIso, sumarDias, diasEntre, nombreCorto, toast, modal, cerrarModal, val } from './ui.js';

export const SECCIONES = [['relevantes', 'Acontecimientos más relevantes'], ['avances', 'Avances observados'], ['dificultades', 'Dificultades o necesidades recurrentes'], ['objetivos', 'Objetivos que requieren mayor atención'], ['seguimiento', 'Temas que necesitan seguimiento']];

/* ---------- periodos ---------- */
export function semanaDe(iso) { const x = new Date(iso + 'T12:00:00'); const d = (x.getDay() + 6) % 7; const ini = sumarDias(iso, -d); return { tipo: 'semanal', inicio: ini, fin: sumarDias(ini, 6) }; }
export function mesDe(iso) { const ini = iso.slice(0, 8) + '01'; const x = new Date(ini + 'T12:00:00'); const fin = new Date(x.getFullYear(), x.getMonth() + 1, 0, 12); fin.setMinutes(fin.getMinutes() - fin.getTimezoneOffset()); return { tipo: 'mensual', inicio: ini, fin: fin.toISOString().slice(0, 10) }; }
export const semanaPasada = () => semanaDe(sumarDias(semanaDe(hoyIso()).inicio, -1));
export const mesPasado = () => mesDe(sumarDias(mesDe(hoyIso()).inicio, -1));
export const nombrePeriodo = p => p.tipo === 'semanal' ? `Semana del ${fecha(p.inicio)} al ${fecha(p.fin)}` : `Mes de ${fechaLarga(p.inicio).split(' de ').slice(1).join(' de ')}`.replace('Mes de ', 'Mes de ');

/* ---------- generador ---------- */
const pct = (n, t) => t ? Math.round(100 * n / t) : 0;
const top = (obj, n = 3) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
const lista = arr => arr.length <= 1 ? arr.join('') : arr.slice(0, -1).join(', ') + ' y ' + arr[arr.length - 1];
const corto = (s, n = 170) => !s ? '' : s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s;

export function metricasDe(bitacoras, subMap) {
  const bs = bitacoras.filter(b => b.estado !== 'borrador');
  const m = { jornadas: bs.length, valoraciones: bs.map(b => b.valoracion_dia).filter(Boolean), diasDificiles: [], diasMuyBuenos: [], lonche: {}, banoVeces: 0, banoAccidentes: 0, conductas: [], social: 0, socialDetalles: [], bloques: { trabajo: 0, con_apoyo: 0, no_trabajo: 0, total: 0 }, porFranja: {}, actividades: {}, participacion: {}, animo: {}, tareasDias: 0, tareasTextos: [], comentarios: [], narrativas: [], sinRevisar: 0, atrasadas: 0 };
  for (const b of bs) {
    const sub = subMap[b.id] || { banos: [], bloques: [] };
    if (b.valoracion_dia <= 2) m.diasDificiles.push(b.fecha_jornada); if (b.valoracion_dia === 5) m.diasMuyBuenos.push(b.fecha_jornada);
    if (b.lonche) m.lonche[b.lonche] = (m.lonche[b.lonche] || 0) + 1;
    m.banoVeces += sub.banos.length; m.banoAccidentes += sub.banos.filter(x => x.que_hizo === 'accidente').length;
    (b.conductas || []).filter(c => c !== 'ninguna').forEach(c => m.conductas.push({ fecha: b.fecha_jornada, tipo: c, detalle: b.conducta_detalle }));
    if (b.habilidades_sociales) { m.social++; if (b.habilidades_detalle) m.socialDetalles.push({ fecha: b.fecha_jornada, texto: b.habilidades_detalle }); }
    sub.bloques.forEach(bl => { if (!bl.valor || bl.valor === 'no_aplica') return; m.bloques[bl.valor] = (m.bloques[bl.valor] || 0) + 1; m.bloques.total++; const fr = bl.hora_inicio.slice(0, 2) + ':00'; m.porFranja[fr] ||= { t: 0, no: 0 }; m.porFranja[fr].t++; if (bl.valor === 'no_trabajo') m.porFranja[fr].no++; });
    if (b.actividades_realizadas) m.actividades[b.actividades_realizadas] = (m.actividades[b.actividades_realizadas] || 0) + 1;
    if (b.participacion) m.participacion[b.participacion] = (m.participacion[b.participacion] || 0) + 1;
    (b.estados_animo || []).forEach(a => { const k = a === 'otro' && b.estado_animo_otro ? b.estado_animo_otro : a; m.animo[k] = (m.animo[k] || 0) + 1; });
    if (b.hay_tareas) { m.tareasDias++; if (b.tareas_pendientes) m.tareasTextos.push({ fecha: b.fecha_jornada, texto: b.tareas_pendientes }); }
    if (b.comentarios_adicionales) m.comentarios.push({ fecha: b.fecha_jornada, texto: b.comentarios_adicionales });
    if (b.resumen_narrativo) m.narrativas.push({ fecha: b.fecha_jornada, texto: b.resumen_narrativo, val: b.valoracion_dia, conducta: (b.conductas || []).some(c => c !== 'ninguna') });
    if (!b.revisada_en) m.sinRevisar++; if (b.enviada_en && b.enviada_en.slice(0, 10) > b.fecha_jornada) m.atrasadas++;
  }
  m.valoracionProm = m.valoraciones.length ? +(m.valoraciones.reduce((a, b) => a + b, 0) / m.valoraciones.length).toFixed(1) : null;
  m.pctTrabajo = pct(m.bloques.trabajo, m.bloques.total); m.pctApoyo = pct(m.bloques.con_apoyo, m.bloques.total); m.pctNo = pct(m.bloques.no_trabajo, m.bloques.total);
  const peor = Object.entries(m.porFranja).filter(([, v]) => v.t >= 2).sort((a, b) => pct(b[1].no, b[1].t) - pct(a[1].no, a[1].t))[0];
  m.peorFranja = peor && pct(peor[1].no, peor[1].t) >= 30 ? { hora: peor[0], pct: pct(peor[1].no, peor[1].t) } : null;
  return m;
}

export function redactar({ est, periodo, bitacoras, subMap, objetivos, cat, anterior }) {
  const E = (t, k) => cat._etiqueta ? cat._etiqueta(t, k) : k;
  const m = metricasDe(bitacoras, subMap); const n = m.jornadas; const nombre = nombreCorto(est.nombre);
  const habiles = api.diasHabiles(est, periodo.inicio, periodo.fin > hoyIso() ? hoyIso() : periodo.fin).filter(f => f >= (est.fecha_inicio_servicio || f));
  const faltan = habiles.filter(f => !bitacoras.some(b => b.fecha_jornada === f && b.estado !== 'borrador'));
  const S = { relevantes: [], avances: [], dificultades: [], objetivos: [], seguimiento: [] };
  if (!n) { S.relevantes.push(`No hay bitácoras enviadas en este periodo (${habiles.length} jornadas escolares).`); return { metricas: m, secciones: S, faltan }; }

  // relevantes
  S.relevantes.push(`Se registraron ${n} jornada${n === 1 ? '' : 's'} de ${habiles.length} posible${habiles.length === 1 ? '' : 's'}${faltan.length ? (faltan.length <= 5 ? ` (sin bitácora: ${lista(faltan.map(f => fecha(f).slice(0, 6).trim()))})` : ` (faltan ${faltan.length} jornadas)`) : ''}.`);
  if (m.valoracionProm) S.relevantes.push(`Valoración promedio del día: ${m.valoracionProm} de 5${anterior?.valoracionProm ? ` (periodo anterior: ${anterior.valoracionProm})` : ''}.${m.diasMuyBuenos.length ? ` Días muy buenos: ${lista(m.diasMuyBuenos.map(f => fecha(f).slice(0, 6)))}.` : ''}${m.diasDificiles.length ? ` Días difíciles: ${lista(m.diasDificiles.map(f => fecha(f).slice(0, 6)))}.` : ''}`);
  m.conductas.forEach(c => S.relevantes.push(`${fecha(c.fecha)}: ${E('conducta', c.tipo).toLowerCase()}.${c.detalle ? ` Antes: ${corto(c.detalle.antes, 90)} Respuesta de la monitora: ${corto(c.detalle.respuesta, 110)}` : ''}`));
  m.narrativas.filter(x => (x.val === 5 || x.val <= 2) && !x.conducta).slice(0, 3).forEach(x => S.relevantes.push(`${fecha(x.fecha)}: ${corto(x.texto)}`));

  // avances
  if (m.bloques.total) S.avances.push(`Trabajó en clase el ${m.pctTrabajo} % de los periodos y con apoyo el ${m.pctApoyo} %${anterior?.bloques?.total ? ` (antes: ${anterior.pctTrabajo} % y ${anterior.pctApoyo} %)` : ''}.`);
  const actOk = (m.actividades.todas || 0) + (m.actividades.mayoria || 0); if (actOk) S.avances.push(`Terminó todas o la mayoría de las actividades en ${actOk} de ${n} jornadas.`);
  if (m.participacion.todas) S.avances.push(`Participó en todas las actividades de la maestra en ${m.participacion.todas} jornada${m.participacion.todas === 1 ? '' : 's'}.`);
  if (m.social) S.avances.push(`Interactuó o desarrolló habilidades sociales en ${m.social} de ${n} jornadas.${m.socialDetalles.length ? ' Ejemplo: ' + corto(m.socialDetalles[m.socialDetalles.length - 1].texto, 120) : ''}`);
  if (m.animo.contento) S.avances.push(`Se le observó contento en ${m.animo.contento} jornada${m.animo.contento === 1 ? '' : 's'}.`);
  if (anterior?.valoracionProm && m.valoracionProm && m.valoracionProm - anterior.valoracionProm >= 0.4) S.avances.push(`La valoración general del día subió ${(m.valoracionProm - anterior.valoracionProm).toFixed(1)} puntos respecto al periodo anterior.`);
  if (!S.avances.length) S.avances.push('Sin avances destacables registrados en las respuestas estructuradas; revisar los resúmenes narrativos.');

  // dificultades
  const porTipo = {}; m.conductas.forEach(c => porTipo[c.tipo] = (porTipo[c.tipo] || 0) + 1); top(porTipo).forEach(([t, k]) => { if (k >= 2) S.dificultades.push(`${E('conducta', t)} se presentó ${k} veces en el periodo.`); });
  if (m.peorFranja) S.dificultades.push(`El periodo con más dificultad para trabajar fue alrededor de las ${m.peorFranja.hora} (no trabajó en el ${m.peorFranja.pct} % de esos bloques).`);
  if (m.pctNo >= 25) S.dificultades.push(`No trabajó en el ${m.pctNo} % de los periodos de clase.`);
  if (m.lonche.no >= 2) S.dificultades.push(`No comió su lonche en ${m.lonche.no} recreos.`); else if ((m.lonche.parte || 0) >= 3) S.dificultades.push(`Dejó parte del lonche en ${m.lonche.parte} recreos.`);
  const neg = ['triste', 'irritado', 'enojado', 'cansado', 'aburrido', 'indiferente'].filter(k => (m.animo[k] || 0) >= 2); if (neg.length) S.dificultades.push(`Estados de ánimo repetidos a observar: ${lista(neg.map(k => E('estado_animo_estudiante', k).toLowerCase() + ' (' + m.animo[k] + ')'))}.`);
  const actMal = (m.actividades.casi_ninguna || 0) + (m.actividades.ninguna || 0); if (actMal >= 2) S.dificultades.push(`Realizó casi ninguna o ninguna actividad en ${actMal} jornadas.`);
  if (m.banoAccidentes) S.dificultades.push(`Se registraron ${m.banoAccidentes} accidente${m.banoAccidentes === 1 ? '' : 's'} al ir al baño.`);
  if (!S.dificultades.length) S.dificultades.push('No se identifican dificultades recurrentes en el periodo.');

  // objetivos
  const enProceso = (objetivos || []).filter(o => o.estado === 'en_proceso').sort((a, b) => a.prioridad - b.prioridad);
  enProceso.slice(0, 4).forEach(o => S.objetivos.push(`${o.descripcion}${o.estrategia ? ` — estrategia acordada: ${corto(o.estrategia, 90)}` : ''}`));
  if (!enProceso.length) S.objetivos.push('Sin objetivos en proceso registrados en el expediente.');

  // seguimiento
  if (m.tareasDias) S.seguimiento.push(`Hubo tareas o pendientes escolares en ${m.tareasDias} jornadas.${m.tareasTextos.length ? ' Último: ' + corto(m.tareasTextos[m.tareasTextos.length - 1].texto, 110) : ''}`);
  m.comentarios.slice(-3).forEach(c => S.seguimiento.push(`${fecha(c.fecha)}: ${corto(c.texto, 140)}`));
  if (faltan.length) S.seguimiento.push(`Faltan bitácoras de ${faltan.length} jornada${faltan.length === 1 ? '' : 's'}.`);
  if (m.atrasadas) S.seguimiento.push(`${m.atrasadas} bitácora${m.atrasadas === 1 ? '' : 's'} se enviaron después del día de la jornada.`);
  if (!S.seguimiento.length) S.seguimiento.push('Sin temas pendientes de seguimiento.');
  return { metricas: m, secciones: S, faltan };
}

/** Genera (o regenera) el borrador de un periodo para un estudiante. No publica. */
export async function generar(est, periodo, cat, { perfilId, sobrescribir = false } = {}) {
  const existente = await api.resumenExistente(est.id, periodo.tipo, periodo.inicio);
  if (existente && !sobrescribir) return existente;
  if (existente && existente.estado === 'publicado') return existente;
  const [bs, objetivos] = await Promise.all([api.bitacorasDe(est.id, { desde: periodo.inicio, hasta: periodo.fin, limite: 200 }), api.objetivosDe(est.id)]);
  const subMap = await api.subtablasLote(bs.map(b => b.id));
  // periodo anterior para comparar
  const antIni = periodo.tipo === 'semanal' ? sumarDias(periodo.inicio, -7) : mesDe(sumarDias(periodo.inicio, -1)).inicio; const antFin = sumarDias(periodo.inicio, -1);
  const bsAnt = await api.bitacorasDe(est.id, { desde: antIni, hasta: antFin, limite: 200 }); const anterior = bsAnt.length ? metricasDe(bsAnt, await api.subtablasLote(bsAnt.map(b => b.id))) : null;
  const { metricas, secciones, faltan } = redactar({ est, periodo, bitacoras: bs, subMap, objetivos, cat, anterior });
  const { valoraciones, narrativas, comentarios, tareasTextos, socialDetalles, porFranja, ...met } = metricas;
  return api.guardarResumen({ ...(existente ? { id: existente.id } : {}), estudiante_id: est.id, tipo: periodo.tipo, periodo_inicio: periodo.inicio, periodo_fin: periodo.fin, contenido: { metricas: { ...met, faltan, bitacoras: bs.map(b => b.id) }, secciones }, generado_automaticamente: true, generado_en: new Date().toISOString(), estado: 'borrador', ...(perfilId ? {} : {}) });
}

/** Simula la tarea programada: asegura borradores de la semana y el mes pasados para todos los estudiantes activos. */
export async function asegurarAutomaticos(cat, { publicarDemo = false } = {}) {
  const pan = await api.panoramaEstudiantes(); const sem = semanaPasada(), mes = mesPasado(); let creados = 0;
  for (const e of pan.filter(x => x.asignacion)) {
    for (const p of [sem, mes]) { const ex = await api.resumenExistente(e.id, p.tipo, p.inicio); if (!ex) { await generar(e, p, cat); creados++; } }
    if (publicarDemo && e.id === 'est-santiago') { const r = await api.resumenExistente(e.id, 'semanal', sem.inicio); if (r && r.estado === 'borrador') await api.guardarResumen({ id: r.id, estado: 'publicado', publicado_en: new Date().toISOString(), revisado_por: 'p-direccion', revisado_en: new Date().toISOString() }); }
  }
  return creados;
}

/* ---------- presentación ---------- */
export function htmlResumen(r, { compacto = false } = {}) {
  const S = r.contenido?.secciones || {}; const m = r.contenido?.metricas || {};
  const chips = [m.jornadas != null ? `${m.jornadas} jornadas` : '', m.valoracionProm ? `valoración ${m.valoracionProm}/5` : '', m.bloques?.total ? `trabajó ${m.pctTrabajo} %` : '', m.conductas?.length ? `${m.conductas.length} conducta${m.conductas.length === 1 ? '' : 's'} registrada${m.conductas.length === 1 ? '' : 's'}` : '', m.social != null && m.jornadas ? `interacción social ${m.social}/${m.jornadas}` : ''].filter(Boolean);
  return `<div class="resumen-doc">${compacto ? '' : `<div class="chips" style="margin-bottom:10px">${chips.map(c => `<span class="tag">${esc(c)}</span>`).join(' ')}</div>`}
    ${SECCIONES.map(([k, t]) => `<div class="sec"><h4>${t}</h4><ul style="margin:4px 0 0 18px;padding:0">${(S[k] || []).map(x => `<li>${esc(x)}</li>`).join('') || '<li class="muted">—</li>'}</ul></div>`).join('')}
    <div class="small muted" style="margin-top:8px">${r.generado_automaticamente ? 'Generado automáticamente desde las bitácoras' : 'Redactado'}${r.revisado_en ? ` · revisado por Dirección el ${fecha(r.revisado_en)}` : ' · borrador sin revisar'}. No sustituye la valoración profesional ni incluye información confidencial del equipo.</div></div>`;
}
export const tagResumen = r => r.estado === 'publicado' ? '<span class="tag ok">Publicado</span>' : r.revisado_en ? '<span class="tag">Revisado · sin publicar</span>' : '<span class="tag warn">Borrador automático</span>';

/** Editor de Dirección: ajusta cada sección (una viñeta por línea), guarda o publica. */
export function editor(r, est, { perfilId, puedePublicar = true, alGuardar, alDescargar }) {
  const S = r.contenido?.secciones || {};
  modal(`Resumen ${r.tipo} · ${esc(nombreCorto(est.nombre))}`, `
    <div class="row small muted" style="margin-bottom:10px">${tagResumen(r)}<span>${nombrePeriodo({ tipo: r.tipo, inicio: r.periodo_inicio, fin: r.periodo_fin })}</span></div>
    <div class="alerta" style="margin-bottom:12px"><span class="tx">Este borrador se armó solo con las respuestas de las bitácoras. Revísalo con criterio profesional, ajusta lo que haga falta y publícalo para que la familia lo vea. Una viñeta por línea.</span></div>
    <div class="form">${SECCIONES.map(([k, t]) => `<div class="f"><label>${t}</label><textarea id="rs_${k}" style="min-height:${k === 'relevantes' ? 120 : 80}px">${esc((S[k] || []).join('\n'))}</textarea></div>`).join('')}</div>`,
    `<button class="btn" data-cerrar>Cerrar</button><button class="btn" id="rs_pdf">Descargar PDF</button><button class="btn" id="rs_regen">Regenerar</button><button class="btn ${puedePublicar ? '' : 'p'}" id="rs_guardar">Guardar borrador</button>${puedePublicar ? `<button class="btn p" id="rs_publicar">${r.estado === 'publicado' ? 'Guardar y mantener publicado' : 'Publicar para la familia'}</button>` : ''}`);
  const leer = () => Object.fromEntries(SECCIONES.map(([k]) => [k, val('rs_' + k).split('\n').map(x => x.trim()).filter(Boolean)]));
  const guardar = async (publicar) => { const secciones = leer(); const fila = { id: r.id, contenido: { ...(r.contenido || {}), secciones }, generado_automaticamente: false, revisado_por: perfilId, revisado_en: new Date().toISOString() }; if (publicar) { fila.estado = 'publicado'; fila.publicado_en = r.publicado_en || new Date().toISOString(); } const g = await api.guardarResumen(fila); cerrarModal(); toast(publicar ? 'Resumen publicado; la familia ya lo ve' : 'Borrador guardado'); alGuardar?.(g); };
  document.getElementById('rs_guardar').onclick = () => guardar(false);
  document.getElementById('rs_publicar')?.addEventListener('click', () => guardar(true));
  document.getElementById('rs_pdf').onclick = () => alDescargar?.({ ...r, contenido: { ...(r.contenido || {}), secciones: leer() } });
  document.getElementById('rs_regen').onclick = async () => { if (!confirm('¿Volver a generar desde las bitácoras? Se pierden tus ajustes de este resumen.')) return; const cat = await api.catalogos(); const g = await generar(est, { tipo: r.tipo, inicio: r.periodo_inicio, fin: r.periodo_fin }, cat, { sobrescribir: true }); cerrarModal(); toast('Resumen regenerado'); alGuardar?.(g); };
}
