/* SIGAE — Dirección, paso E: evaluaciones y objetivos por ciclo + indicadores de impacto.
   Regla: el sistema muestra patrones y enlaza a la fuente; la conclusión es de Dirección. */
import * as api from './api.js';
import { esc, fecha, hoyIso, sumarDias, toast, modal, cerrarModal, val, nombreCorto } from './ui.js';
import { TIPOS, ORDEN, ESCALA, ESTADO_OBJ, AVANCE_OBJ, PRIORIDAD, dimsDe, objsDe, tagEval, ultimaDe, comparativo, htmlComparativo, htmlObjetivos } from './evaluacion.js';
import { metricasDe } from './resumen.js';
import * as pdf from './pdf.js';

const hoy = hoyIso();
const SENTIR_ATENCION = ['cansada', 'incomoda', 'animo_bajo', 'triste', 'enojada'];

/* ======================= Evaluaciones y objetivos ======================= */
export async function evaluaciones(vista, ctx, params = {}) {
  const pan = await api.panoramaEstudiantes();
  const estId = params.id || pan[0]?.id; if (!estId) { vista.innerHTML = '<div class="vacio">No hay estudiantes activos.</div>'; return; }
  const e = pan.find(x => x.id === estId) || pan[0];
  const [ciclos, objetivos, evals, perfiles] = await Promise.all([api.ciclosDe(e.id), api.objetivosDe(e.id), api.evaluacionesDe(e.id), api.perfiles()]);
  const ciclo = ciclos.find(c => c.activo) || null;
  const objCiclo = ciclo ? objetivos.filter(o => o.ciclo_id === ciclo.id) : objetivos.filter(o => !o.ciclo_id);
  const evCiclo = ciclo ? evals.filter(ev => ev.ciclo_id === ciclo.id) : evals;
  const dims = ctx.cat.dimension_evaluacion || [];
  const cmp = comparativo({ evals: evCiclo, objetivos: objCiclo, dimensiones: dims });
  const nombreDe = id => nombreCorto(perfiles.find(p => p.id === id)?.nombre || 'Dirección');
  const recargar = () => evaluaciones(vista, ctx, { id: e.id });
  const cerrados = ciclos.filter(c => !c.activo);

  vista.innerHTML = `<div class="row"><h1 class="titulo">Evaluaciones y objetivos</h1><div class="sp"></div><select id="evEst" class="sel">${pan.map(x => `<option value="${x.id}" ${x.id === e.id ? 'selected' : ''}>${esc(x.nombre)}</option>`).join('')}</select></div>
  <div class="subtitulo">Diagnóstica, intermedia y final por ciclo escolar, con los objetivos de acompañamiento. El comparativo muestra cambios; la lectura profesional es tuya.</div>
  <div class="card" style="margin-bottom:12px"><div class="hd"><h3>${ciclo ? esc(ciclo.nombre) : 'Sin ciclo activo'}</h3>${ciclo ? `<span class="small muted">${fecha(ciclo.fecha_inicio)} – ${ciclo.fecha_fin ? fecha(ciclo.fecha_fin) : 'abierto'}</span>` : ''}<div class="sp"></div>${cerrados.length ? `<button class="btn s" id="evHist">Ciclos anteriores (${cerrados.length})</button>` : ''}<button class="btn s" id="evCiclo">${ciclo ? 'Cerrar ciclo y abrir uno nuevo' : 'Abrir ciclo'}</button><button class="btn s" id="evPdf">Descargar PDF</button></div>
    <div class="bd"><div class="grid g3">${ORDEN.map(t => { const ev = ultimaDe(evCiclo, t); return `<div class="eval-caja"><div class="row" style="justify-content:space-between"><b>${TIPOS[t]}</b>${tagEval(ev, hoy)}</div><div class="small muted" style="margin:4px 0 8px">${ev?.realizada ? `Aplicada por ${esc(nombreDe(ev.aplicada_por))}${ev.visible_familia ? ' · la familia la ve' : ' · solo equipo'}` : t === 'diagnostica' ? 'Al inicio del acompañamiento o del ciclo.' : t === 'intermedia' ? 'A mitad del ciclo.' : 'Al cierre del ciclo.'}</div><div class="row" style="gap:6px">${!ev ? `<button class="btn s" data-prog="${t}">Programar</button><button class="btn s p" data-cap="${t}">Capturar</button>` : ev.realizada ? `<button class="btn s" data-cap="${t}" data-ev="${ev.id}">Ver / editar</button>` : `<button class="btn s" data-prog="${t}" data-ev="${ev.id}">Reprogramar</button><button class="btn s p" data-cap="${t}" data-ev="${ev.id}">Capturar</button>`}</div></div>`; }).join('')}</div></div></div>
  <div class="grid g-21">
    <div class="card"><div class="hd"><h3>Comparativo del ciclo</h3><div class="sp"></div>${cmp.promedioDelta != null ? `<span class="small muted">Cambio promedio entre la primera y la última: <b>${cmp.promedioDelta > 0 ? '+' : ''}${cmp.promedioDelta}</b></span>` : ''}</div><div class="bd">${htmlComparativo(cmp)}</div></div>
    <div class="card"><div class="hd"><h3>Objetivos</h3><div class="sp"></div><span class="small muted">${cmp.alcanzados}/${cmp.total} alcanzados</span><button class="btn s p" id="evNuevoObj">＋ Objetivo</button></div><div class="bd sin">${htmlObjetivos(objCiclo, { editable: true })}</div><div class="bd small muted" style="border-top:1px solid var(--line)">Toca un objetivo para editarlo, cambiar su estado o decidir quién lo ve. Los objetivos no se borran: se marcan alcanzados o en pausa.</div></div>
  </div>`;

  document.getElementById('evEst').onchange = ev => evaluaciones(vista, ctx, { id: ev.target.value });
  vista.querySelectorAll('[data-prog]').forEach(b => b.onclick = () => programar(evals.find(x => x.id === b.dataset.ev) || null, { est: e, ciclo, tipo: b.dataset.prog, alGuardar: recargar }));
  vista.querySelectorAll('[data-cap]').forEach(b => b.onclick = () => formEvaluacion(evals.find(x => x.id === b.dataset.ev) || null, { est: e, ciclo, tipo: b.dataset.cap, objetivos: objCiclo, dims, perfilId: ctx.perfil.id, alGuardar: recargar }));
  document.getElementById('evNuevoObj').onclick = () => formObjetivo(null, { est: e, ciclo, alGuardar: recargar });
  vista.querySelectorAll('[data-ob]').forEach(li => li.onclick = () => formObjetivo(objCiclo.find(o => o.id === li.dataset.ob), { est: e, ciclo, alGuardar: recargar }));
  document.getElementById('evCiclo').onclick = () => nuevoCiclo({ est: e, ciclo, objetivos: objCiclo, alGuardar: recargar });
  document.getElementById('evPdf').onclick = () => pdf.pdfEvaluaciones({ est: e, moni: e.monitora, ciclo, cmp });
  document.getElementById('evHist')?.addEventListener('click', () => {
    modal(`Ciclos anteriores · ${esc(nombreCorto(e.nombre))}`, cerrados.map(c => { const k = comparativo({ evals: evals.filter(ev => ev.ciclo_id === c.id), objetivos: objetivos.filter(o => o.ciclo_id === c.id), dimensiones: dims }); return `<h4 style="margin:6px 0 8px">${esc(c.nombre)} <span class="small muted" style="font-weight:500">${fecha(c.fecha_inicio)} – ${fecha(c.fecha_fin)}</span></h4>${htmlComparativo(k, { compacto: true })}<div style="margin:8px 0 16px">${htmlObjetivos(objetivos.filter(o => o.ciclo_id === c.id))}</div>`; }).join('<hr style="border:0;border-top:1px solid var(--line)">'));
  });
}

function programar(ev, { est, ciclo, tipo, alGuardar }) {
  modal(`${ev ? 'Reprogramar' : 'Programar'} evaluación ${TIPOS[tipo].toLowerCase()} · ${esc(nombreCorto(est.nombre))}`, `<div class="form"><div class="f"><label>Fecha prevista</label><input type="date" id="pr_f" value="${ev?.fecha || sumarDias(hoy, 7)}"></div><div class="small muted">Aparecerá en tu calendario y en el de la monitora. Cuando la apliques, usa «Capturar».</div></div>`, `<button class="btn" data-cerrar>Cancelar</button><button class="btn p" id="pr_ok">Guardar</button>`);
  document.getElementById('pr_ok').onclick = async () => { if (!val('pr_f')) { toast('Elige la fecha.'); return; } await api.guardarEvaluacion({ ...(ev ? { id: ev.id } : { estudiante_id: est.id, ciclo_id: ciclo?.id || null, tipo, realizada: false, resultados: {}, visible_monitora: true, visible_familia: false }), fecha: val('pr_f') }); cerrarModal(); toast('Evaluación programada'); alGuardar?.(); };
}

/** Captura o edición de una evaluación: dimensiones 1–5, valoración por objetivo, observaciones y visibilidad. */
export function formEvaluacion(ev, { est, ciclo, tipo, objetivos, dims, perfilId, alGuardar }) {
  const v = ev || {}; const d = dimsDe(v); const ob = objsDe(v);
  modal(`Evaluación ${TIPOS[tipo].toLowerCase()} · ${esc(nombreCorto(est.nombre))}`, `<div class="form">
    <div class="form g2"><div class="f"><label>Fecha de aplicación</label><input type="date" id="fe_f" value="${v.fecha || hoy}"></div><div class="f"><label>Estado</label><select id="fe_r"><option value="1" ${v.realizada !== false ? 'selected' : ''}>Aplicada</option><option value="0" ${v.realizada === false ? 'selected' : ''}>Programada, aún sin aplicar</option></select></div></div>
    <div class="f"><label>Dimensiones <span class="muted">· 1 = con apoyo constante · 5 = de forma autónoma</span></label><div class="escalas">${dims.map(x => `<div class="esc-fila"><span>${esc(x.etiqueta)}</span><div class="vals" data-dim="${x.clave}">${ESCALA.map(([n, t]) => `<button type="button" class="${d[x.clave] === n ? 'on' : ''}" data-n="${n}" title="${t}">${n}</button>`).join('')}</div></div>`).join('') || '<div class="small muted">No hay dimensiones en el catálogo «Dimensiones de evaluación».</div>'}</div></div>
    ${objetivos.length ? `<div class="f"><label>Objetivos del ciclo</label>${objetivos.map(o => `<div class="obj-fila"><div class="small b">${esc(o.descripcion)}</div><div class="row" style="gap:6px;margin-top:4px"><select data-obj="${o.id}" class="sel s">${['', 'avance', 'sin_cambio', 'alcanzado', 'atencion'].map(k => `<option value="${k}" ${(ob[o.id]?.estado || '') === k ? 'selected' : ''}>${k ? AVANCE_OBJ[k] : '— sin valorar —'}</option>`).join('')}</select><input data-objnota="${o.id}" placeholder="Nota breve (opcional)" value="${esc(ob[o.id]?.nota || '')}" style="flex:1;min-width:160px"></div></div>`).join('')}</div>` : ''}
    <div class="f"><label>Observaciones profesionales</label><textarea id="fe_o" placeholder="Qué observaste, en qué contexto, qué recomiendas…">${esc(v.observaciones || '')}</textarea></div>
    <div class="form g2"><label class="chk"><input type="checkbox" id="fe_vm" ${v.visible_monitora !== false ? 'checked' : ''}> La monitora puede consultarla</label><label class="chk"><input type="checkbox" id="fe_vf" ${v.visible_familia ? 'checked' : ''}> La familia ve niveles y objetivos (nunca las observaciones)</label></div>
  </div>`, `<button class="btn" data-cerrar>Cancelar</button><button class="btn p" id="fe_ok">Guardar</button>`);
  const m = document.getElementById('modal');
  m.querySelectorAll('.esc-fila .vals button').forEach(b => b.onclick = () => { const estaba = b.classList.contains('on'); b.parentElement.querySelectorAll('button').forEach(x => x.classList.remove('on')); if (!estaba) b.classList.add('on'); });
  document.getElementById('fe_ok').onclick = async () => {
    const dimensiones = {}; m.querySelectorAll('.esc-fila .vals').forEach(g => { const on = g.querySelector('button.on'); if (on) dimensiones[g.dataset.dim] = Number(on.dataset.n); });
    const objs = {}; m.querySelectorAll('[data-obj]').forEach(s => { if (s.value) objs[s.dataset.obj] = { estado: s.value, nota: m.querySelector(`[data-objnota="${s.dataset.obj}"]`).value.trim() || null }; });
    const realizada = val('fe_r') === '1';
    if (realizada && !Object.keys(dimensiones).length) { toast('Captura al menos una dimensión.'); return; }
    await api.guardarEvaluacion({ ...(ev ? { id: ev.id } : { estudiante_id: est.id, ciclo_id: ciclo?.id || null, tipo }), fecha: val('fe_f') || null, realizada, aplicada_por: realizada ? perfilId : null, resultados: { dimensiones, objetivos: objs }, observaciones: val('fe_o') || null, visible_monitora: val('fe_vm'), visible_familia: val('fe_vf') });
    // Si Dirección marcó un objetivo como alcanzado en la evaluación, el objetivo cambia de estado (es su decisión explícita).
    for (const [id, x] of Object.entries(objs)) { const o = objetivos.find(y => y.id === id); if (x.estado === 'alcanzado' && o && o.estado !== 'alcanzado') await api.guardarObjetivo({ id, estado: 'alcanzado' }); }
    cerrarModal(); toast('Evaluación guardada'); alGuardar?.();
  };
}

export function formObjetivo(o, { est, ciclo, alGuardar }) {
  const v = o || {};
  modal(o ? 'Editar objetivo' : `Nuevo objetivo · ${esc(nombreCorto(est.nombre))}`, `<div class="form">
    <div class="f"><label>Objetivo de acompañamiento</label><input id="fo_d" value="${esc(v.descripcion || '')}" placeholder="Ej. Pedir ayuda con palabras antes de frustrarse"></div>
    <div class="f"><label>Estrategia acordada</label><textarea id="fo_e" placeholder="Cómo se va a trabajar en el aula…">${esc(v.estrategia || '')}</textarea></div>
    <div class="form g3"><div class="f"><label>Prioridad</label><select id="fo_p">${[1, 2, 3].map(p => `<option value="${p}" ${(v.prioridad || 2) === p ? 'selected' : ''}>${PRIORIDAD[p]}</option>`).join('')}</select></div><div class="f"><label>Estado</label><select id="fo_s">${Object.entries(ESTADO_OBJ).map(([k, t]) => `<option value="${k}" ${(v.estado || 'en_proceso') === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div><div class="f"><label>Ciclo</label><input value="${esc(ciclo?.nombre || 'Sin ciclo')}" disabled></div></div>
    <div class="form g2"><label class="chk"><input type="checkbox" id="fo_vm" ${v.visible_monitora !== false ? 'checked' : ''}> La monitora lo ve</label><label class="chk"><input type="checkbox" id="fo_vf" ${v.visible_familia !== false ? 'checked' : ''}> La familia lo ve</label></div>
  </div>`, `<button class="btn" data-cerrar>Cancelar</button><button class="btn p" id="fo_ok">Guardar</button>`);
  document.getElementById('fo_ok').onclick = async () => {
    if (!val('fo_d')) { toast('Escribe el objetivo.'); return; }
    await api.guardarObjetivo({ ...(o ? { id: o.id } : { estudiante_id: est.id, ciclo_id: ciclo?.id || null }), descripcion: val('fo_d'), estrategia: val('fo_e') || null, prioridad: Number(val('fo_p')), estado: val('fo_s'), visible_monitora: val('fo_vm'), visible_familia: val('fo_vf') });
    cerrarModal(); toast('Objetivo guardado'); alGuardar?.();
  };
}

function nuevoCiclo({ est, ciclo, objetivos, alGuardar }) {
  const y = Number(hoy.slice(0, 4)); const sugerido = `Ciclo escolar ${hoy.slice(5, 7) >= '07' ? y : y - 1}-${hoy.slice(5, 7) >= '07' ? y + 1 : y}`;
  const enProceso = objetivos.filter(o => o.estado === 'en_proceso');
  modal(ciclo ? 'Cerrar ciclo y abrir uno nuevo' : 'Abrir ciclo', `<div class="form">
    ${ciclo ? `<div class="alerta"><span class="tx small">Se cierra <b>${esc(ciclo.nombre)}</b> con fecha de hoy. Sus evaluaciones y objetivos se conservan en «Ciclos anteriores». Nada se borra.</span></div>` : ''}
    <div class="f"><label>Nombre del ciclo</label><input id="nc_n" value="${esc(sugerido)}"></div>
    <div class="form g2"><div class="f"><label>Inicio</label><input type="date" id="nc_i" value="${hoy}"></div><div class="f"><label>Fin previsto (opcional)</label><input type="date" id="nc_f"></div></div>
    ${enProceso.length ? `<label class="chk"><input type="checkbox" id="nc_c" checked> Copiar al nuevo ciclo los ${enProceso.length} objetivo${enProceso.length > 1 ? 's' : ''} que siguen en proceso</label>` : ''}
  </div>`, `<button class="btn" data-cerrar>Cancelar</button><button class="btn p" id="nc_ok">${ciclo ? 'Cerrar y abrir' : 'Abrir ciclo'}</button>`);
  document.getElementById('nc_ok').onclick = async () => {
    if (!val('nc_n')) { toast('Ponle nombre al ciclo.'); return; }
    if (ciclo) await api.guardarCiclo({ id: ciclo.id, activo: false, fecha_fin: ciclo.fecha_fin && ciclo.fecha_fin < hoy ? ciclo.fecha_fin : hoy });
    const nuevo = await api.guardarCiclo({ estudiante_id: est.id, nombre: val('nc_n'), fecha_inicio: val('nc_i') || hoy, fecha_fin: val('nc_f') || null, activo: true });
    if (val('nc_c')) for (const o of enProceso) await api.guardarObjetivo({ estudiante_id: est.id, ciclo_id: nuevo.id, descripcion: o.descripcion, estrategia: o.estrategia, estado: 'en_proceso', prioridad: o.prioridad, visible_monitora: o.visible_monitora, visible_familia: o.visible_familia });
    cerrarModal(); toast('Ciclo abierto'); alGuardar?.();
  };
}

/** Tarjeta compacta para el expediente del estudiante. */
export async function htmlEvaluacionesEstudiante(estId, cat) {
  const [ciclo, objetivos, evals] = await Promise.all([api.cicloActivo(estId), api.objetivosDe(estId), api.evaluacionesDe(estId)]);
  const objC = ciclo ? objetivos.filter(o => o.ciclo_id === ciclo.id) : objetivos; const evC = ciclo ? evals.filter(ev => ev.ciclo_id === ciclo.id) : evals;
  const cmp = comparativo({ evals: evC, objetivos: objC, dimensiones: cat.dimension_evaluacion || [] });
  return `<div class="card"><div class="hd"><h3>Evaluaciones y objetivos</h3><span class="small muted">${esc(ciclo?.nombre || 'sin ciclo')}</span><div class="sp"></div><button class="btn s" data-abrir-eval="${estId}">Abrir</button></div><div class="bd"><div class="row" style="gap:6px;margin-bottom:8px">${ORDEN.map(t => `<span class="small">${TIPOS[t][0]}: ${tagEval(ultimaDe(evC, t), hoy)}</span>`).join('')}</div>${htmlComparativo(cmp, { compacto: true })}</div><div class="bd sin" style="border-top:1px solid var(--line)">${htmlObjetivos(objC)}</div></div>`;
}

/* ======================= Indicadores e impacto ======================= */
const avg = a => a.length ? +(a.reduce((p, q) => p + q, 0) / a.length).toFixed(1) : null;
const pct = (n, t) => t ? Math.round(100 * n / t) : null;
const fmt = (x, suf = '') => x == null ? '—' : `${x}${suf}`;
/** Diferencia contra el periodo anterior. `inverso` = menos es la dirección que se resalta en verde (p. ej. conductas). */
function cambio(a, b, { suf = '', inverso = false, dec = 0 } = {}) {
  if (a == null || b == null) return '<span class="muted small">sin periodo de comparación</span>';
  const d = +(a - b).toFixed(dec); if (!d) return '<span class="delta eq">= igual que las 4 semanas anteriores</span>';
  const arriba = inverso ? d < 0 : d > 0; return `<span class="delta ${arriba ? 'up' : 'down'}">${d > 0 ? '▲ +' : '▼ '}${d}${suf} vs. las 4 semanas anteriores</span>`;
}
function spark(vals, { max = null, titulos = [] } = {}) {
  const v = vals.map(x => x ?? 0); const mx = max || Math.max(1, ...v); const w = 300, h = 44, px = 6;
  const X = i => px + (i / Math.max(1, v.length - 1)) * (w - 2 * px), Y = x => h - 6 - (x / mx) * (h - 14);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}"><polyline fill="none" stroke="var(--navy-2)" stroke-width="2" points="${v.map((x, i) => `${X(i)},${Y(x)}`).join(' ')}"/>${v.map((x, i) => `<circle cx="${X(i)}" cy="${Y(x)}" r="3" fill="${vals[i] == null ? '#ddd' : 'var(--navy)'}"><title>${esc(titulos[i] || '')}: ${vals[i] ?? 'sin datos'}</title></circle>`).join('')}</svg>`;
}
const ind = (l, n, sub = '', extra = '') => `<div class="ind"><div class="l">${l}<small>${sub}</small></div><div class="n">${n}</div>${extra ? `<div class="full">${extra}</div>` : ''}</div>`;

export async function indicadores(vista, ctx) {
  vista.innerHTML = '<div class="vacio">Calculando indicadores…</div>';
  const [pan, fams, tutores, monis, esps, evals, objs, ciclos] = await Promise.all([api.panoramaEstudiantes(), api.familias(), api.tutoresTodos(), api.monitoras(), api.especialistasTodos(), api.evaluacionesTodas(), api.objetivosTodos(), api.ciclosTodos()]);
  const dims = ctx.cat.dimension_evaluacion || [];
  const monisActivas = monis.filter(m => (m.estado || 'activa') === 'activa');
  const externos = esps.filter(x => x.tipo !== 'personal_escolar'), escolar = esps.filter(x => x.tipo === 'personal_escolar');
  const companeros = pan.reduce((a, e) => a + (e.companeros_salon || 0), 0);
  const escuelas = new Set(pan.map(e => e.escuela).filter(Boolean)).size;
  const famIds = new Set(pan.map(e => e.familia_id)); const tutActivos = tutores.filter(t => famIds.has(t.familia_id));
  const indirecto = tutActivos.length + externos.length + escolar.length + companeros;

  // avances por estudiante (ciclo activo)
  const porEst = pan.map(e => { const c = ciclos.find(x => x.estudiante_id === e.id && x.activo) || null; const ev = evals.filter(x => x.estudiante_id === e.id && (!c || x.ciclo_id === c.id)); const ob = objs.filter(x => x.estudiante_id === e.id && (!c || x.ciclo_id === c.id)); return { e, c, cmp: comparativo({ evals: ev, objetivos: ob, dimensiones: dims }) }; });
  const conDos = porEst.filter(x => x.cmp.hechas.length > 1);
  const promDim = dims.map(d => { const ini = [], fin = []; conDos.forEach(x => { const f = x.cmp.filas.find(r => r.clave === d.clave); if (f?.ini != null && f?.fin != null) { ini.push(f.ini); fin.push(f.fin); } }); return { etiqueta: d.etiqueta, ini: avg(ini), fin: avg(fin), n: fin.length }; });
  const objActivos = porEst.flatMap(x => x.cmp.objs);
  const objAlc = objActivos.filter(o => o.estado === 'alcanzado').length, objProc = objActivos.filter(o => o.estado === 'en_proceso').length, objPausa = objActivos.filter(o => o.estado === 'pausado').length, objAlta = objActivos.filter(o => o.estado === 'en_proceso' && o.prioridad === 1).length;
  const evHechas = evals.filter(ev => ev.realizada).length, evVencidas = evals.filter(ev => !ev.realizada && ev.fecha && ev.fecha < hoy).length;

  // tendencias de bitácoras: 8 semanas (últimas 4 vs 4 anteriores)
  const desde = sumarDias(hoy, -55); const bs = (await api.bitacorasEntre(desde, hoy)).filter(b => b.estado !== 'borrador'); const subMap = await api.subtablasLote(bs.map(b => b.id));
  const corte = sumarDias(hoy, -27);
  const rec = metricasDe(bs.filter(b => b.fecha_jornada >= corte), subMap), ant = metricasDe(bs.filter(b => b.fecha_jornada < corte), subMap);
  const semanas = []; for (let i = 7; i >= 0; i--) { const a = sumarDias(hoy, -7 * i - 6), b = sumarDias(hoy, -7 * i); semanas.push({ a, b, m: metricasDe(bs.filter(x => x.fecha_jornada >= a && x.fecha_jornada <= b), subMap) }); }
  const tit = semanas.map(s => `${fecha(s.a).slice(0, 6)} – ${fecha(s.b).slice(0, 6)}`);
  const topAnimo = Object.entries(rec.animo).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => `${esc(ctx.cat._etiqueta('estado_animo_estudiante', k))} (${n})`).join(', ');
  const lect = await api.lecturasDe(bs.filter(b => b.fecha_jornada >= sumarDias(hoy, -13)).map(b => b.id)); const env14 = bs.filter(b => b.fecha_jornada >= sumarDias(hoy, -13)).length; const leidas14 = new Set(lect.map(l => l.bitacora_id)).size;

  // bienestar del equipo: solo el conteo agregado (lo individual vive en Monitoras y es confidencial)
  let aObservar = 0; for (const m of monisActivas) { const s = await api.sentirDeMonitora(m.id, sumarDias(hoy, -14)); if (s.filter(x => (x.sentimientos || []).some(k => SENTIR_ATENCION.includes(k))).length >= 4) aObservar++; }

  const kpi = (l, v, d) => `<div class="card kpi"><div class="l">${l}</div><div class="v">${v}</div><div class="d">${d}</div></div>`;
  vista.innerHTML = `<h1 class="titulo">Indicadores e impacto</h1><div class="subtitulo">Cuánto crece SHADOW, a cuántas personas llega y qué cambios se observan. Cada cifra enlaza a su fuente; la interpretación es de Dirección.</div>
  <div class="ind-grupo"><h2>Alcance</h2>
    <div class="grid g4">${kpi('Estudiantes acompañados', pan.length, `en ${escuelas} escuela${escuelas === 1 ? '' : 's'}`)}${kpi('Familias', famIds.size, `${tutActivos.length} madres, padres o tutores con cuenta`)}${kpi('Monitoras activas', monisActivas.length, `${pan.filter(e => e.monitora).length} estudiantes con monitora asignada`)}${kpi('Red de apoyo', externos.length + escolar.length, `${externos.length} terapeutas y especialistas · ${escolar.length} personal escolar`)}</div>
    <div class="grid g-21" style="margin-top:12px"><div class="card"><div class="bd"><div class="row"><div><div class="small muted">Personas alcanzadas de forma indirecta</div><div style="font-size:30px;font-weight:800;line-height:1.1">${indirecto}</div></div><div class="sp"></div><div class="small muted" style="max-width:420px">Suma de tutores con cuenta (${tutActivos.length}), terapeutas y especialistas (${externos.length}), personal escolar (${escolar.length}) y compañeros de salón de cada estudiante (${companeros}). Es una estimación de a cuántas personas toca el acompañamiento en las comunidades educativas.</div></div></div></div>
    <div class="card"><div class="bd sin"><table><thead><tr><th>Estudiante</th><th>Compañeros</th><th>Red</th></tr></thead><tbody>${pan.map(e => `<tr><td>${esc(nombreCorto(e.nombre))}<div class="small muted">${esc(e.escuela || '')}</div></td><td class="mono">${e.companeros_salon ?? '—'}</td><td class="mono">${esps.filter(x => x.estudiante_id === e.id).length}</td></tr>`).join('')}</tbody></table></div></div></div>
  </div>
  <div class="ind-grupo"><h2>Avances por estudiante</h2>
    <div class="card"><div class="bd sin"><div class="tabla-wrap"><table><thead><tr><th>Estudiante</th><th>En SHADOW desde</th><th>Evaluaciones del ciclo</th><th>Cambio promedio</th><th>Objetivos</th><th>Necesidades presentes</th><th></th></tr></thead><tbody>
      ${porEst.map(({ e, c, cmp }) => `<tr class="click" data-eval="${e.id}"><td><b>${esc(nombreCorto(e.nombre))}</b><div class="small muted">${esc(c?.nombre || 'sin ciclo')}</div></td><td class="small">${fecha(e.fecha_inicio_servicio)}</td><td class="small">${ORDEN.map(t => { const ev = ultimaDe(cmp.hechas, t); return `<span class="tag ${ev ? 'ok' : 'gray'}" title="${TIPOS[t]}">${TIPOS[t][0]}${ev ? ' ' + fecha(ev.fecha).slice(0, 6) : ''}</span>`; }).join(' ')}</td><td>${cmp.promedioDelta == null ? '<span class="muted small">falta una 2ª evaluación</span>' : `<span class="delta ${cmp.promedioDelta > 0 ? 'up' : cmp.promedioDelta < 0 ? 'down' : 'eq'}">${cmp.promedioDelta > 0 ? '▲ +' : cmp.promedioDelta < 0 ? '▼ ' : '= '}${cmp.promedioDelta}</span><div class="small muted">de ${TIPOS[cmp.primera.tipo].toLowerCase()} a ${TIPOS[cmp.ultima.tipo].toLowerCase()}</div>`}</td><td><span class="tag ${cmp.total && cmp.alcanzados === cmp.total ? 'ok' : ''}">${cmp.alcanzados}/${cmp.total} alcanzados</span></td><td class="small">${cmp.necesidades.length ? cmp.necesidades.map(n => esc(n.etiqueta)).join(', ') : cmp.ultima ? '<span class="muted">ninguna en nivel 1–2</span>' : '<span class="muted">—</span>'}</td><td><button class="btn s">Ver</button></td></tr>`).join('')}</tbody></table></div></div></div>
    <div class="grid g2" style="margin-top:12px">
      <div class="card"><div class="hd"><h3>Resultados del modelo por dimensión</h3><div class="sp"></div><span class="small muted">${conDos.length} estudiante${conDos.length === 1 ? '' : 's'} con 2 o más evaluaciones</span></div><div class="bd">${conDos.length ? `<div class="barh"><span class="small muted">Dimensión</span><span class="small muted">Primera evaluación</span><span class="small muted">Más reciente</span><span></span>${promDim.filter(d => d.n).map(d => `<span>${esc(d.etiqueta)}</span><div class="tr"><i style="width:${(d.ini / 5) * 100}%"></i></div><div class="tr"><i class="fin" style="width:${(d.fin / 5) * 100}%"></i></div><span class="mono small">${d.ini} → ${d.fin}</span>`).join('')}</div><div class="small muted" style="margin-top:8px">Promedio de los niveles (1–5) en la primera evaluación del ciclo y en la más reciente, solo de quienes ya tienen dos. Léelo junto con las observaciones de cada estudiante.</div>` : '<div class="vacio">Cuando haya estudiantes con dos evaluaciones aplicadas, aquí verás el promedio por dimensión.</div>'}</div></div>
      <div class="card"><div class="hd"><h3>Objetivos y evaluaciones</h3></div><div class="bd">
        ${ind('Objetivos alcanzados', `${objAlc}<span class="muted" style="font-size:14px">/${objActivos.length}</span>`, 'en los ciclos activos')}${ind('En proceso', objProc, `${objAlta} de prioridad alta`)}${ind('En pausa', objPausa, '')}${ind('Evaluaciones aplicadas', evHechas, evVencidas ? `<span style="color:var(--red)">${evVencidas} programada${evVencidas > 1 ? 's' : ''} ya vencida${evVencidas > 1 ? 's' : ''}</span>` : 'ninguna vencida')}
      </div></div>
    </div>
  </div>
  <div class="ind-grupo"><h2>Tendencias de las bitácoras <span class="small muted" style="font-weight:500">· últimas 4 semanas (${fecha(corte)} – ${fecha(hoy)}) frente a las 4 anteriores</span></h2>
    <div class="grid g2">
      <div class="card"><div class="bd">
        ${ind('Jornadas registradas', rec.jornadas, cambio(rec.jornadas, ant.jornadas))}
        ${ind('Valoración promedio del día', fmt(rec.valoracionProm, ' / 5'), cambio(rec.valoracionProm, ant.valoracionProm, { dec: 1 }))}
        ${ind('Trabajó sin apoyo', fmt(pct(rec.bloques.trabajo, rec.bloques.total), ' %'), cambio(pct(rec.bloques.trabajo, rec.bloques.total), pct(ant.bloques.trabajo, ant.bloques.total), { suf: ' pts' }) + '<br>' + `<span class="small muted">de los bloques de 30 min · con apoyo ${fmt(pct(rec.bloques.con_apoyo, rec.bloques.total), ' %')} · no trabajó ${fmt(pct(rec.bloques.no_trabajo, rec.bloques.total), ' %')}</span>`)}
        ${ind('Conductas registradas', rec.conductas.length, cambio(rec.conductas.length, ant.conductas.length, { inverso: true }))}
        ${ind('Días con interacción social', rec.social, cambio(pct(rec.social, rec.jornadas), pct(ant.social, ant.jornadas), { suf: ' pts' }) + ` <span class="small muted">· ${fmt(pct(rec.social, rec.jornadas), ' %')} de las jornadas</span>`)}
        ${ind('No comió el lonche', fmt(pct(rec.lonche.no || 0, rec.jornadas), ' %'), cambio(pct(rec.lonche.no || 0, rec.jornadas), pct(ant.lonche.no || 0, ant.jornadas), { suf: ' pts', inverso: true }))}
        ${ind('Participó en todas las actividades', fmt(pct(rec.participacion.todas || 0, rec.jornadas), ' %'), cambio(pct(rec.participacion.todas || 0, rec.jornadas), pct(ant.participacion.todas || 0, ant.jornadas), { suf: ' pts' }))}
        ${ind('Estados de ánimo más frecuentes', '', topAnimo || 'sin registros')}
      </div><div class="bd" style="border-top:1px solid var(--line)"><button class="btn s" data-ir-bit="${corte}">Ver las bitácoras del periodo</button></div></div>
      <div class="card"><div class="hd"><h3>Semana a semana</h3><div class="sp"></div><span class="small muted">8 semanas</span></div><div class="bd">
        <div class="small b">Valoración promedio del día (1–5)</div>${spark(semanas.map(s => s.m.valoracionProm), { max: 5, titulos: tit })}
        <div class="small b" style="margin-top:8px">Bloques en que trabajó sin apoyo (%)</div>${spark(semanas.map(s => pct(s.m.bloques.trabajo, s.m.bloques.total)), { max: 100, titulos: tit })}
        <div class="small b" style="margin-top:8px">Conductas registradas por semana</div>${spark(semanas.map(s => s.m.conductas.length), { titulos: tit })}
        <div class="small b" style="margin-top:8px">Jornadas registradas por semana</div>${spark(semanas.map(s => s.m.jornadas), { titulos: tit })}
        <div class="small muted" style="margin-top:8px">Pasa el cursor por los puntos para ver la semana. Suma de todos los estudiantes.</div>
      </div></div>
    </div>
  </div>
  <div class="grid g2">
    <div class="card"><div class="hd"><h3>Familias</h3></div><div class="bd">${ind('Bitácoras leídas por la familia', fmt(pct(leidas14, env14), ' %'), `${leidas14} de ${env14} enviadas en 14 días`)}<button class="btn s" data-ir="familias" style="margin-top:8px">Ver familias</button></div></div>
    <div class="card"><div class="hd"><h3>Bienestar del equipo <span class="tag conf">Confidencial</span></h3></div><div class="bd">${ind('Monitoras con señales repetidas', `${aObservar}<span class="muted" style="font-size:14px">/${monisActivas.length}</span>`, 'cansancio, incomodidad, ánimo bajo, tristeza o enojo en 4+ de sus últimas jornadas (14 días)')}<button class="btn s" data-ir="monitoras" style="margin-top:8px">Ver monitoras</button><div class="small muted" style="margin-top:8px">Aquí solo se muestra el conteo. El detalle por persona vive en Monitoras y nunca sale en descargas.</div></div></div>
  </div>
  <div class="alerta" style="margin-top:14px"><span class="tx small">Estos indicadores muestran <b>patrones</b>, no conclusiones: una cifra aislada no dice que un estudiante mejoró o empeoró. Interprétalos junto con las evaluaciones, los objetivos y las observaciones profesionales, y abre la fuente cuando algo llame la atención.</span></div>`;

  vista.querySelectorAll('[data-eval]').forEach(tr => tr.onclick = () => ctx.ir('evaluaciones', { id: tr.dataset.eval }));
  vista.querySelector('[data-ir-bit]').onclick = () => ctx.ir('bitacoras', { desde: corte });
  vista.querySelectorAll('[data-ir]').forEach(b => b.onclick = () => ctx.ir(b.dataset.ir));
}
