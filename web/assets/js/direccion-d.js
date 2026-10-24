/* SIGAE — Dirección, paso D: pestaña Resúmenes, selector de periodo y descargas. */
import * as api from './api.js';
import * as pdf from './pdf.js';
import { generar, asegurarAutomaticos, editor, htmlResumen, tagResumen, semanaDe, mesDe, semanaPasada, mesPasado, nombrePeriodo } from './resumen.js';
import { esc, fecha, hoyIso, sumarDias, toast, modal, cerrarModal, val, nombreCorto } from './ui.js';

/** Selector de periodo (semana o mes que contiene una fecha). Llama a `cb(periodo)`. */
export function elegirPeriodo(titulo, cb, { porDefecto = 'semanal' } = {}) {
  const ayer = sumarDias(hoyIso(), -1);
  modal(titulo, `<div class="form g2"><div class="f"><label>Tipo</label><select id="pe_tipo"><option value="semanal" ${porDefecto === 'semanal' ? 'selected' : ''}>Semana</option><option value="mensual" ${porDefecto === 'mensual' ? 'selected' : ''}>Mes</option></select></div><div class="f"><label>Una fecha dentro del periodo</label><input type="date" id="pe_f" value="${ayer}" max="${hoyIso()}"></div></div><div class="small muted" id="pe_txt" style="margin-top:8px"></div>`,
    `<button class="btn" data-cerrar>Cancelar</button><button class="btn p" id="pe_ok">Continuar</button>`);
  const calc = () => { const t = val('pe_tipo'); const f = val('pe_f') || ayer; return t === 'semanal' ? semanaDe(f) : mesDe(f); };
  const pintar = () => { document.getElementById('pe_txt').textContent = nombrePeriodo(calc()); };
  document.getElementById('pe_tipo').onchange = pintar; document.getElementById('pe_f').onchange = pintar; pintar();
  document.getElementById('pe_ok').onclick = () => { const p = calc(); cerrarModal(); cb(p); };
}

/** Descarga el compendio de un periodo; si no hay resumen, genera un borrador primero. */
export async function descargarCompendio(est, periodo, cat, { crearBorrador = true } = {}) {
  let r = await api.resumenExistente(est.id, periodo.tipo, periodo.inicio);
  if (!r && crearBorrador) r = await generar(est, periodo, cat);
  const asig = await api.asignacionActiva(est.id); const moni = asig ? await api.monitora(asig.monitora_id) : null;
  await pdf.pdfCompendio({ est, moni, periodo, resumen: r, cat });
}

export async function resumenes(vista, ctx) {
  const [rs, pan] = await Promise.all([api.resumenesTodos(), api.panoramaEstudiantes()]);
  const sem = semanaPasada(), mes = mesPasado();
  const filtro = ctx._filtroRes || 'todos';
  const vis = rs.filter(r => filtro === 'todos' || (filtro === 'borradores' ? r.estado === 'borrador' : r.estado === 'publicado'));
  vista.innerHTML = `<div class="row"><h1 class="titulo">Resúmenes</h1><div class="sp"></div><button class="btn" id="rsGenSem">Generar semana pasada (todos)</button><button class="btn" id="rsGenMes">Generar mes pasado (todos)</button><button class="btn p" id="rsGenUno">＋ Generar para un estudiante</button></div>
  <div class="subtitulo">Cada lunes y cada día 1 el sistema arma un borrador por estudiante a partir de sus bitácoras. Tú lo revisas, lo ajustas y lo publicas; la familia solo ve lo publicado. Ningún resumen incluye la sección confidencial de la monitora.</div>
  <div class="grid g3" style="margin-bottom:14px"><div class="card kpi"><div class="l">Borradores por revisar</div><div class="v">${rs.filter(r => r.estado === 'borrador').length}</div><div class="d">semana pasada: ${nombrePeriodo(sem).replace('Semana del ', '')}</div></div><div class="card kpi"><div class="l">Publicados</div><div class="v">${rs.filter(r => r.estado === 'publicado').length}</div><div class="d">visibles para las familias</div></div><div class="card kpi"><div class="l">Estudiantes sin resumen de la semana pasada</div><div class="v">${pan.filter(e => e.asignacion && !rs.some(r => r.estudiante_id === e.id && r.tipo === 'semanal' && r.periodo_inicio === sem.inicio)).length}</div><div class="d">de ${pan.filter(e => e.asignacion).length} activos</div></div></div>
  <div class="row" style="margin-bottom:10px">${['todos', 'borradores', 'publicados'].map(f => `<button class="btn s ${filtro === f ? 'p' : ''}" data-f="${f}">${f[0].toUpperCase() + f.slice(1)}</button>`).join('')}</div>
  <div class="card"><div class="bd sin"><div class="tabla-wrap"><table><thead><tr><th>Estudiante</th><th>Tipo</th><th>Periodo</th><th>Jornadas</th><th>Valoración</th><th>Estado</th><th>Generado</th><th></th></tr></thead><tbody>
    ${vis.map(r => { const e = pan.find(x => x.id === r.estudiante_id); const m = r.contenido?.metricas || {}; return `<tr class="click" data-id="${r.id}"><td><b>${esc(nombreCorto(e?.nombre || ''))}</b></td><td>${r.tipo === 'semanal' ? 'Semanal' : 'Mensual'}</td><td class="small">${fecha(r.periodo_inicio)} – ${fecha(r.periodo_fin)}</td><td class="mono">${m.jornadas ?? '—'}${m.faltan?.length ? ` <span class="tag warn" title="Jornadas sin bitácora">−${m.faltan.length}</span>` : ''}</td><td class="mono">${m.valoracionProm ?? '—'}</td><td>${tagResumen(r)}</td><td class="small muted">${fecha(r.generado_en)}${r.generado_automaticamente ? ' · automático' : ' · editado'}</td><td class="row" style="gap:4px;justify-content:flex-end"><button class="btn s" data-pdf="${r.id}">PDF</button><button class="btn s p" data-abrir="${r.id}">Abrir</button></td></tr>`; }).join('') || '<tr><td colspan="8" class="vacio">No hay resúmenes todavía. Genera los de la semana pasada.</td></tr>'}</tbody></table></div></div></div>`;
  const refrescar = () => resumenes(vista, ctx);
  const abrirEditor = (r) => { const e = pan.find(x => x.id === r.estudiante_id); editor(r, e, { perfilId: ctx.perfil.id, alGuardar: refrescar, alDescargar: async (rr) => { const moni = e.monitora; await pdf.pdfCompendio({ est: e, moni, periodo: { tipo: r.tipo, inicio: r.periodo_inicio, fin: r.periodo_fin }, resumen: rr, cat: ctx.cat }); } }); };
  vista.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { ctx._filtroRes = b.dataset.f; refrescar(); });
  vista.querySelectorAll('[data-abrir]').forEach(b => b.onclick = ev => { ev.stopPropagation(); abrirEditor(rs.find(r => r.id === b.dataset.abrir)); });
  vista.querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => abrirEditor(rs.find(r => r.id === tr.dataset.id)));
  vista.querySelectorAll('[data-pdf]').forEach(b => b.onclick = async ev => { ev.stopPropagation(); const r = rs.find(x => x.id === b.dataset.pdf); const e = pan.find(x => x.id === r.estudiante_id); await pdf.pdfCompendio({ est: e, moni: e.monitora, periodo: { tipo: r.tipo, inicio: r.periodo_inicio, fin: r.periodo_fin }, resumen: r, cat: ctx.cat }); });
  const genTodos = async (p) => { let n = 0; for (const e of pan.filter(x => x.asignacion)) { const ex = await api.resumenExistente(e.id, p.tipo, p.inicio); if (!ex) { await generar(e, p, ctx.cat); n++; } } toast(n ? `${n} borrador${n === 1 ? '' : 'es'} generado${n === 1 ? '' : 's'}` : 'Ya existían todos'); refrescar(); };
  document.getElementById('rsGenSem').onclick = () => genTodos(sem); document.getElementById('rsGenMes').onclick = () => genTodos(mes);
  document.getElementById('rsGenUno').onclick = () => { modal('Generar resumen', `<div class="f"><label>Estudiante</label><select id="g_e">${pan.filter(e => e.asignacion).map(e => `<option value="${e.id}">${esc(e.nombre)}</option>`).join('')}</select></div>`, `<button class="btn" data-cerrar>Cancelar</button><button class="btn p" id="g_ok">Elegir periodo</button>`); document.getElementById('g_ok').onclick = () => { const e = pan.find(x => x.id === val('g_e')); cerrarModal(); elegirPeriodo(`Periodo para ${nombreCorto(e.nombre)}`, async p => { const r = await generar(e, p, ctx.cat); toast(r.estado === 'publicado' ? 'Ese periodo ya estaba publicado' : 'Borrador listo'); refrescar(); abrirEditor(r); }); }; };
}

/** Tarjeta de resúmenes para el expediente del estudiante. */
export async function htmlResumenesEstudiante(estId) {
  const rs = await api.resumenesDe(estId);
  return `<div class="card"><div class="hd"><h3>Resúmenes semanales y mensuales</h3><div class="sp"></div><button class="btn s" data-res-nuevo>＋ Generar</button></div><div class="bd sin"><ul class="lista">${rs.slice(0, 8).map(r => `<li class="click" data-res="${r.id}" style="padding:8px 14px"><div class="tx"><b>${r.tipo === 'semanal' ? 'Semana' : 'Mes'} · ${fecha(r.periodo_inicio)} – ${fecha(r.periodo_fin)}</b><div class="m">${(r.contenido?.secciones?.relevantes || [])[0] || ''}</div></div>${tagResumen(r)}</li>`).join('') || '<li class="vacio">Aún no hay resúmenes. Genera el de la semana pasada.</li>'}</ul></div></div>`;
}
export function engancharResumenesEstudiante(root, est, ctx, alCambiar) {
  root.querySelector('[data-res-nuevo]')?.addEventListener('click', () => elegirPeriodo(`Periodo para ${nombreCorto(est.nombre)}`, async p => { const r = await generar(est, p, ctx.cat); alCambiar?.(); editor(r, est, { perfilId: ctx.perfil.id, alGuardar: alCambiar, alDescargar: rr => pdf.pdfCompendio({ est, moni: est.monitora, periodo: p, resumen: rr, cat: ctx.cat }) }); }));
  root.querySelectorAll('[data-res]').forEach(li => li.onclick = async () => { const rs = await api.resumenesDe(est.id); const r = rs.find(x => x.id === li.dataset.res); editor(r, est, { perfilId: ctx.perfil.id, alGuardar: alCambiar, alDescargar: rr => pdf.pdfCompendio({ est, moni: est.monitora, periodo: { tipo: r.tipo, inicio: r.periodo_inicio, fin: r.periodo_fin }, resumen: rr, cat: ctx.cat }) }); });
}
export { asegurarAutomaticos };
