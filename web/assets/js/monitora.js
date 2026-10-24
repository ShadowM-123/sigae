/* SIGAE — perfil de la monitora educativa. */
import * as api from './api.js';
import { exigir } from './auth.js';
import { marco, esc, fecha, fechaLarga, hora, horaCorta, hoyIso, sumarDias, diasEntre, toast, modal, cerrarModal, iniciales, nombreCorto, edadTexto, proximoCumple, estadoBitacora, valoracionTexto, esFinDeSemana } from './ui.js';
import { armarWizard, renderLectura, porcentajeAvance } from './bitacora.js';
import { htmlRedApoyo } from './direccion-c.js';
import { montarCalendario } from './calendario.js';
import { avisosMonitora, pintarAvisos } from './avisos.js';

const perfil = await exigir(['monitora']);
const cat = await api.catalogos();
let estudiantes = await api.estudiantesDeMonitora(perfil.id);
const vista = document.getElementById('vista');
const q = new URLSearchParams(location.search);
let estSel = estudiantes.find(e => e.id === q.get('est')) || estudiantes[0] || null;

const TABS = [
  { id: 'inicio', ic: '⌂', tx: 'Inicio' }, { id: 'bitacora', ic: '✎', tx: 'Bitácora' }, { id: 'estudiante', ic: '☺', tx: 'Mi estudiante' }, { id: 'misbit', ic: '☰', tx: 'Mis bitácoras' }, { id: 'calendario', ic: '📅', tx: 'Calendario' },
  { id: 'academia', ic: '▶', tx: 'Academia', pronto: true }, { id: 'materiales', ic: '▤', tx: 'Materiales', pronto: true },
];
const { pintar: pintarTabs } = marco({ perfil, tabs: TABS, activa: q.get('tab') || 'inicio', onTab: ir, subtitulo: 'Monitora educativa' });

async function ir(tab, params = {}) { pintarTabs(tab); vista.innerHTML = '<div class="vacio">Cargando…</div>'; window.scrollTo(0, 0); await ({ inicio, bitacora, estudiante: miEstudiante, misbit, calendario }[tab] || inicio)(params); }

async function calendario() {
  vista.innerHTML = `<h1 class="titulo">Calendario</h1><div class="subtitulo">Cumpleaños y citas de tu estudiante, evaluaciones programadas, visitas y capacitaciones.</div><div id="calMoni"></div>`;
  montarCalendario(document.getElementById('calMoni'), { cargar: async (a, b) => {
    const out = []; const [eventos] = await Promise.all([api.eventosEntre(a, b)]);
    for (const e of estudiantes) {
      if (e.fecha_nacimiento) { const f = a.slice(0, 4) + '-' + e.fecha_nacimiento.slice(5); if (f >= a && f <= b) out.push({ id: 'c' + e.id, fecha: f, tipo: 'cumple', titulo: `Cumpleaños de ${nombreCorto(e.nombre)}`, sub: 'Tu estudiante' }); }
      const [citas, evals] = await Promise.all([api.citasDe(e.id), api.evaluacionesDe(e.id)]);
      citas.filter(c => c.fecha >= a && c.fecha <= b).forEach(c => out.push({ id: c.id, fecha: c.fecha, hora: c.hora, tipo: 'cita', titulo: `${nombreCorto(e.nombre)} · ${c.especialista_nombre || c.especialidad}`, sub: [c.especialidad, c.lugar_modalidad].filter(Boolean).join(' · ') }));
      evals.filter(ev => ev.fecha && ev.fecha >= a && ev.fecha <= b).forEach(ev => out.push({ id: ev.id, fecha: ev.fecha, tipo: 'evaluacion', titulo: `Evaluación ${ev.tipo} · ${nombreCorto(e.nombre)}`, sub: ev.realizada ? 'Realizada' : 'Programada' }));
    }
    eventos.filter(ev => ev.monitora_id === perfil.id || (ev.estudiante_id && estudiantes.some(e => e.id === ev.estudiante_id)) || ev.tipo === 'capacitacion').forEach(ev => out.push({ id: ev.id, fecha: ev.fecha, hora: ev.hora, tipo: ev.tipo, titulo: ev.titulo, sub: ev.lugar || '' }));
    return out;
  } });
}

/* ---------- utilidades ---------- */
const selectorEst = (actual, cb) => estudiantes.length > 1 ? `<div class="f" style="margin-bottom:12px"><label>Estudiante</label><select id="selEst">${estudiantes.map(e => `<option value="${e.id}" ${actual?.id === e.id ? 'selected' : ''}>${esc(e.nombre)}</option>`).join('')}</select></div>` : '';
async function pendientesDe(est, dias = 7) {
  const hoy = hoyIso(); const desde = sumarDias(hoy, -dias);
  const bs = await api.bitacorasDe(est.id, { desde }); const habiles = api.diasHabiles(est, desde, sumarDias(hoy, -1)).filter(f => f >= (est.asignacion?.fecha_inicio || f));
  const faltan = habiles.filter(f => !bs.find(b => b.fecha_jornada === f && b.estado !== 'borrador'));
  const correcciones = bs.filter(b => b.estado === 'requiere_correccion');
  const hoyB = bs.find(b => b.fecha_jornada === hoy) || null;
  return { faltan, correcciones, hoyB, bs };
}

/* ---------- Inicio ---------- */
async function inicio() {
  if (!estudiantes.length) { vista.innerHTML = `<h1 class="titulo">Hola, ${esc(perfil.nombre.split(' ')[0])}</h1><div class="alerta warn"><span class="tx">Todavía no tienes un estudiante asignado. Dirección te avisará cuando lo haya.</span></div>`; return; }
  const hoy = hoyIso(); const finde = esFinDeSemana(hoy);
  const tarjetas = [];
  for (const est of estudiantes) {
    const p = await pendientesDe(est);
    const b = p.hoyB; const avance = b ? porcentajeAvance(b) : 0;
    const estado = !b ? 'sin' : b.estado === 'borrador' ? 'borrador' : 'enviada';
    tarjetas.push(`<div class="card destacada"><div class="bd">
      <div class="row"><span class="ava g" style="background:rgba(255,255,255,.15);color:#fff">${iniciales(est.nombre)}</span><div><div class="small muted">Bitácora de hoy · ${fechaLarga(hoy)}</div><h2 style="font-family:var(--serif);font-size:24px;font-weight:600">${esc(nombreCorto(est.nombre))}</h2></div></div>
      <div style="margin:14px 0 10px">${finde && !b ? '<div class="small muted">Hoy no hay jornada escolar. Si trabajaste, puedes registrarla de todas formas.</div>' : estado === 'enviada' ? `<div class="row"><span class="tag ok">Enviada ${hora(b.enviada_en)}</span><span class="small muted">Valoración del día: ${b.valoracion_dia}/5</span></div>` : estado === 'borrador' ? `<div class="row"><span class="tag warn">Borrador · ${avance} % completo</span><span class="small muted">Puedes continuar donde te quedaste.</span></div>` : `<div class="small">Aún no has registrado la jornada de hoy. Toma unos 3 minutos.</div>`}</div>
      <button class="btn a g" data-bit="${est.id}">${estado === 'enviada' ? 'Ver la bitácora de hoy' : estado === 'borrador' ? 'Continuar la bitácora' : 'Comenzar la bitácora del día'}</button>
    </div></div>`);
    const avisos = [];
    p.correcciones.forEach(c => avisos.push(`<div class="alerta bad"><span class="tx"><b>Dirección pidió corregir</b> la bitácora del ${fecha(c.fecha_jornada)}: ${esc(c.observacion_direccion || '')}</span><button class="btn s" data-corr="${est.id}|${c.fecha_jornada}">Corregir</button></div>`));
    p.faltan.forEach(f => avisos.push(`<div class="alerta warn"><span class="tx">Falta la bitácora del <b>${fechaLarga(f)}</b> de ${esc(nombreCorto(est.nombre))}.</span><button class="btn s" data-corr="${est.id}|${f}">Registrar</button></div>`));
    const cumple = proximoCumple(est.fecha_nacimiento);
    if (cumple && cumple.dias <= 30) avisos.push(`<div class="alerta ok"><span class="tx">🎂 ${esc(nombreCorto(est.nombre))} cumple años el <b>${fecha(cumple.fecha)}</b> (${cumple.dias === 0 ? '¡hoy!' : `en ${cumple.dias} días`}).</span></div>`);
    if (avisos.length) tarjetas.push(`<div class="col">${avisos.join('')}</div>`);
  }
  vista.innerHTML = `<h1 class="titulo">Hola, ${esc(perfil.nombre.split(' ')[0])} 👋</h1><div class="subtitulo">${fechaLarga(hoy)}</div>
    <div class="col" style="gap:12px">${tarjetas.join('')}</div>
    <div class="grid g2" style="margin-top:14px">
      <div class="card"><div class="hd"><h3>Avisos</h3></div><div class="bd" id="avisosMoni"><div class="small muted">Calculando…</div></div></div>
      <div class="card"><div class="hd"><h3>Mis entregas</h3></div><div class="bd" id="resumenEntregas"><div class="small muted">Calculando…</div></div></div>
      <div class="card"><div class="hd"><h3>Academia SHADOW</h3></div><div class="bd"><p class="small muted">Tu avance en capacitaciones y las evaluaciones pendientes aparecerán aquí. Esta sección se construye en un paso posterior.</p></div></div>
    </div>`;
  avisosMonitora(perfil.id, estudiantes).then(av => { const el = document.getElementById('avisosMoni'); if (el) el.innerHTML = pintarAvisos(av, { vacio: 'Sin avisos por ahora.' }); });
  vista.querySelectorAll('[data-bit]').forEach(btn => btn.onclick = () => { estSel = estudiantes.find(e => e.id === btn.dataset.bit); ir('bitacora', { fecha: hoy }); });
  vista.querySelectorAll('[data-corr]').forEach(btn => btn.onclick = () => { const [id, f] = btn.dataset.corr.split('|'); estSel = estudiantes.find(e => e.id === id); ir('bitacora', { fecha: f }); });
  // resumen de entregas (30 días)
  const desde = sumarDias(hoy, -30); const bs = await api.bitacorasDeMonitora(perfil.id, { desde });
  const env = bs.filter(b => b.estado !== 'borrador').length; const habiles = estudiantes.reduce((n, e) => n + api.diasHabiles(e, desde, hoy).length, 0);
  document.getElementById('resumenEntregas').innerHTML = `<div class="row" style="gap:18px"><div><div class="kpi" style="padding:0"><div class="v">${env}</div><div class="d">bitácoras enviadas en 30 días</div></div></div><div><div class="kpi" style="padding:0"><div class="v">${habiles ? Math.round(100 * Math.min(env, habiles) / habiles) : 0}%</div><div class="d">de las jornadas registradas</div></div></div></div>`;
}

/* ---------- Bitácora ---------- */
async function bitacora(params = {}) {
  if (!estudiantes.length) return inicio();
  const est = estSel || estudiantes[0]; const f = params.fecha || hoyIso();
  vista.innerHTML = `<div class="row"><h1 class="titulo">Bitácora diaria</h1><div class="sp"></div><div class="f"><input type="date" id="fechaBit" value="${f}" max="${hoyIso()}" style="padding:8px 10px;font-size:14px"></div></div>
    ${selectorEst(est)}<div id="zonaBit"></div>`;
  vista.querySelector('#selEst')?.addEventListener('change', e => { estSel = estudiantes.find(x => x.id === e.target.value); bitacora({ fecha: document.getElementById('fechaBit').value }); });
  vista.querySelector('#fechaBit').onchange = e => bitacora({ fecha: e.target.value });
  const zona = document.getElementById('zonaBit');
  const b = await api.bitacoraDe(est.id, f);
  const sub = b ? await api.subtablas(b.id, { conConfidencial: true }) : null;
  const abrirWizard = () => armarWizard(zona, { estudiante: est, perfil, cat, bitacora: b, sub, fechaJornada: f, alTerminar: () => ir('inicio'), alSalir: () => ir('inicio') });
  if (b && (b.estado === 'enviada' || b.estado === 'corregida')) {
    for (const foto of sub.fotos) foto._url = await api.urlFoto(foto.storage_path);
    zona.innerHTML = `<div class="alerta ok" style="margin-bottom:12px"><span class="tx">Esta bitácora ya fue enviada el ${fecha(b.enviada_en)} a las ${hora(b.enviada_en)}.${b.revisada_en ? ' Dirección ya la revisó.' : ''}</span></div>${b.revisada_en && b.observacion_direccion ? `<div class="alerta" style="margin-bottom:12px"><span class="tx"><b>Comentario de Dirección:</b> ${esc(b.observacion_direccion)}</span></div>` : ''}<div class="card lectura"><div class="bd">${renderLectura({ b, sub, cat, est, confidencial: true })}</div></div>`;
    return;
  }
  if (b && b.estado === 'requiere_correccion') {
    for (const foto of sub.fotos) foto._url = await api.urlFoto(foto.storage_path);
    zona.innerHTML = `<div class="alerta bad" style="margin-bottom:12px"><span class="tx"><b>Dirección pidió una corrección:</b> ${esc(b.observacion_direccion || '')}</span><button class="btn s p" id="btnCorregir">Corregir</button></div><div class="card lectura"><div class="bd">${renderLectura({ b, sub, cat, est, confidencial: true })}</div></div>`;
    document.getElementById('btnCorregir').onclick = () => { b.paso_actual = 0; abrirWizard(); };
    return;
  }
  if (!b && f !== hoyIso()) zona.innerHTML = `<div class="alerta warn" style="margin-bottom:12px"><span class="tx">Vas a registrar una <b>bitácora atrasada</b> del ${fechaLarga(f)}. Se guardará con esa fecha de jornada y la fecha real de envío.</span></div><div id="zonaW"></div>`;
  abrirWizard();
}

/* ---------- Mi estudiante ---------- */
async function miEstudiante() {
  if (!estudiantes.length) return inicio();
  const est = estSel || estudiantes[0];
  const [fam, tutores, objetivos, evaluaciones] = await Promise.all([api.familia(est.familia_id), api.tutoresDe(est.familia_id), api.objetivosDe(est.id), api.evaluacionesDe(est.id)]);
  const cumple = proximoCumple(est.fecha_nacimiento);
  const dias = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  vista.innerHTML = `<h1 class="titulo">Mi estudiante</h1>${selectorEst(est)}
  <div class="card" style="margin-bottom:12px"><div class="bd"><div class="row" style="gap:14px"><span class="ava g">${iniciales(est.nombre)}</span><div><h2 style="font-family:var(--serif);font-size:22px;font-weight:600">${esc(est.nombre)}</h2><div class="muted small">${edadTexto(est.fecha_nacimiento)} · nació el ${fecha(est.fecha_nacimiento)}${cumple ? ` · cumple en ${cumple.dias} días` : ''}</div>${est.foto_autorizada ? '' : '<div class="small muted">Foto no autorizada por la familia.</div>'}</div></div></div></div>
  <div class="grid g2">
    <div class="card"><div class="hd"><h3>Escuela y horario</h3></div><div class="bd"><p><b>${esc(est.escuela)}</b><br>${esc(est.grado)} · grupo ${esc(est.grupo || '—')}<br><span class="muted small">${esc(est.direccion_escuela || '')}</span></p><p>Horario: <b>${horaCorta(est.hora_entrada)} a ${horaCorta(est.hora_salida)}</b>${est.hora_recreo_inicio ? ` · recreo ${horaCorta(est.hora_recreo_inicio)}–${horaCorta(est.hora_recreo_fin)}` : ''}<br>Días: ${(est.dias_asistencia || []).map(d => dias[d]).join(', ')}</p></div></div>
    <div class="card"><div class="hd"><h3>Perfil de desarrollo</h3></div><div class="bd"><p><b>Diagnóstico:</b> ${esc(est.diagnostico || '—')}</p><p>${esc(est.perfil_desarrollo || '')}</p><p><b>Necesidades de apoyo</b></p><div class="chips">${(est.necesidades_apoyo || []).map(n => `<span class="tag">${esc(n)}</span>`).join(' ')}</div></div></div>
    <div class="card"><div class="hd"><h3>Familia</h3></div><div class="bd"><p>${esc(est.dinamica_familiar || '')}</p><ul class="lista">${tutores.map(t => `<li style="padding:8px 0"><span class="ava">${iniciales(t.nombre)}</span><div class="tx"><b>${esc(t.nombre)}</b><div class="m">${esc(t.parentesco || '')} · ${esc(t.telefono || '')}</div></div></li>`).join('')}</ul></div></div>
    <div class="card"><div class="hd"><h3>Objetivos de acompañamiento</h3></div><div class="bd sin"><ul class="lista">${objetivos.filter(o => o.visible_monitora).map(o => `<li><div class="tx"><b>${esc(o.descripcion)}</b><div class="m">${esc(o.estrategia || '')}</div></div><span class="tag ${o.estado === 'alcanzado' ? 'ok' : o.estado === 'pausado' ? 'gray' : ''}">${{ en_proceso: 'En proceso', alcanzado: 'Alcanzado', pausado: 'Pausado' }[o.estado]}</span></li>`).join('') || '<li class="muted">Sin objetivos registrados.</li>'}</ul></div></div>
    <div class="card"><div class="hd"><h3>Evaluaciones</h3></div><div class="bd sin"><ul class="lista">${evaluaciones.filter(e => e.visible_monitora).map(e => `<li><div class="tx"><b>${{ diagnostica: 'Diagnóstica', intermedia: 'Intermedia', final: 'Final' }[e.tipo]}</b><div class="m">${e.realizada ? `Aplicada el ${fecha(e.fecha)}${e.observaciones ? ' · ' + esc(e.observaciones) : ''}` : e.fecha ? `Programada para el ${fecha(e.fecha)}` : 'Pendiente de programar'}</div></div>${e.realizada ? '<span class="tag ok">Hecha</span>' : '<span class="tag warn">Pendiente</span>'}</li>`).join('') || '<li class="muted">Sin evaluaciones.</li>'}</ul></div></div>
  </div>
  <h3 style="margin:16px 0 8px;font-size:15px">Red de apoyo: terapias, especialistas y citas</h3>${await htmlRedApoyo(est.id, { editable: false })}`;
  vista.querySelector('#selEst')?.addEventListener('change', e => { estSel = estudiantes.find(x => x.id === e.target.value); miEstudiante(); });
}

/* ---------- Mis bitácoras ---------- */
async function misbit() {
  const hoy = hoyIso(); const desde = sumarDias(hoy, -60);
  const bs = await api.bitacorasDeMonitora(perfil.id, { desde });
  const lect = await api.lecturasDe(bs.map(b => b.id));
  const pend = []; for (const est of estudiantes) { const p = await pendientesDe(est, 14); p.faltan.forEach(f => pend.push({ est, f })); }
  vista.innerHTML = `<div class="row"><h1 class="titulo">Mis bitácoras</h1><div class="sp"></div><button class="btn s" id="btnDesc">Descargar semana / mes</button></div><div class="subtitulo">Últimos 60 días. Toca una para leerla completa.</div>
  ${pend.length ? `<div class="alerta warn" style="margin-bottom:12px"><span class="tx"><b>${pend.length} jornada${pend.length > 1 ? 's' : ''} sin bitácora</b> en las últimas dos semanas: ${pend.map(p => fecha(p.f)).join(', ')}.</span></div>` : ''}
  <div class="card"><div class="bd sin"><ul class="lista">${bs.map(b => { const est = estudiantes.find(e => e.id === b.estudiante_id); const leida = lect.some(l => l.bitacora_id === b.id); return `<li class="click" data-id="${b.id}"><div class="tx"><b>${fechaLarga(b.fecha_jornada)}</b><div class="m">${esc(nombreCorto(est?.nombre || ''))}${b.valoracion_dia ? ` · ${b.valoracion_dia}/5 ${valoracionTexto(b.valoracion_dia)}` : ''}${b.enviada_en ? ` · enviada ${hora(b.enviada_en)}` : ''}${leida ? ' · 👁 leída por la familia' : ''}</div></div>${estadoBitacora(b.estado)}</li>`; }).join('') || '<li class="vacio">Aún no hay bitácoras.</li>'}</ul></div></div>`;
  vista.querySelectorAll('[data-id]').forEach(li => li.onclick = async () => { const b = bs.find(x => x.id === li.dataset.id); const est = estudiantes.find(e => e.id === b.estudiante_id) || await api.estudiante(b.estudiante_id); const sub = await api.subtablas(b.id, { conConfidencial: true }); for (const f of sub.fotos) f._url = await api.urlFoto(f.storage_path); modal(`Bitácora · ${fecha(b.fecha_jornada)}`, `<div class="lectura">${renderLectura({ b, sub, cat, est, confidencial: true })}</div>`, `<button class="btn" data-cerrar>Cerrar</button>${b.estado !== 'enviada' && b.estado !== 'corregida' ? `<button class="btn p" id="mEditar">${b.estado === 'requiere_correccion' ? 'Corregir' : 'Continuar'}</button>` : ''}`); document.getElementById('mEditar')?.addEventListener('click', () => { cerrarModal(); estSel = est; ir('bitacora', { fecha: b.fecha_jornada }); }); });
  document.getElementById('btnDesc').onclick = () => toast('La descarga por semana y por mes, con su resumen, llega en el paso D.');
}

ir(q.get('tab') || 'inicio', { fecha: q.get('fecha') || undefined });
