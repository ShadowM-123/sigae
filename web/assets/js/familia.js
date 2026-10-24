/* SIGAE — portal de la familia. Pensado para celular. Nunca muestra la sección confidencial de la monitora. */
import * as api from './api.js';
import { exigir } from './auth.js';
import { marco, esc, fecha, fechaLarga, hora, hoyIso, sumarDias, diasEntre, toast, modal, cerrarModal, val, iniciales, nombreCorto, dinero, relativo, valoracionTexto } from './ui.js';
import { renderLectura } from './bitacora.js';
import { htmlRedApoyo, engancharRedApoyo } from './direccion-c.js';
import { montarCalendario } from './calendario.js';
import { avisosFamilia, pintarAvisos, ESTADOS_SOL, tagSol } from './avisos.js';

const perfil = await exigir(['familia']);
const cat = await api.catalogos();
const hijos = await api.estudiantesDeFamilia(perfil.id);
const vista = document.getElementById('vista');
let hijo = hijos[0] || null;

const TABS = [
  { id: 'inicio', ic: '⌂', tx: 'Inicio' }, { id: 'bitacoras', ic: '☰', tx: 'Bitácoras' }, { id: 'terapias', ic: '🩺', tx: 'Terapias y citas' }, { id: 'recursos', ic: '▤', tx: 'Recursos', pronto: true },
];
const { pintar: pintarTabs } = marco({ perfil, tabs: TABS, activa: 'inicio', onTab: ir, subtitulo: 'Portal de la familia' });
async function ir(tab) { pintarTabs(tab); vista.innerHTML = '<div class="vacio">Cargando…</div>'; window.scrollTo(0, 0); await ({ inicio, bitacoras, terapias }[tab] || inicio)(); }

const selectorHijo = () => hijos.length > 1 ? `<div class="f" style="margin-bottom:12px"><label>Hijo o hija</label><select id="selHijo">${hijos.map(e => `<option value="${e.id}" ${hijo?.id === e.id ? 'selected' : ''}>${esc(e.nombre)}</option>`).join('')}</select></div>` : '';
const F = { educacion_especial: 'Lic. en Educación Especial', educacion: 'Lic. en Educación', puericultura: 'Técnico en puericultura', psicologia_general: 'Lic. en Psicología', psicologia_clinica: 'Lic. en Psicología Clínica', psicologia_educativa: 'Lic. en Psicología Educativa', fisioterapia: 'Fisioterapeuta', medicina: 'Médica', trabajo_social: 'Trabajadora social' };

async function lecturaDe(b, est, monitora) {
  const sub = await api.subtablas(b.id, { conConfidencial: false });
  for (const f of sub.fotos) f._url = await api.urlFoto(f.storage_path);
  api.registrarLectura(b.id, perfil.id);
  return renderLectura({ b, sub, cat, est, monitora, confidencial: false });
}

/* ---------- Inicio ---------- */
async function inicio() {
  if (!hijo) { vista.innerHTML = `<h1 class="titulo">Hola, ${esc(perfil.nombre.split(' ')[0])}</h1><div class="alerta warn"><span class="tx">Tu cuenta aún no está vinculada a un estudiante. Escríbenos a SHADOW para activarla.</span></div>`; return; }
  const hoy = hoyIso();
  const [asig, bs, pago] = await Promise.all([api.asignacionActiva(hijo.id), api.bitacorasDe(hijo.id, { desde: sumarDias(hoy, -45) }), api.proximoPago(hijo.familia.id)]);
  const moni = asig ? await api.monitora(asig.monitora_id) : null;
  const enviadas = bs.filter(b => b.estado !== 'borrador');
  const hoyB = enviadas.find(b => b.fecha_jornada === hoy);
  let idx = hoyB ? enviadas.indexOf(hoyB) : 0;   // la más reciente
  const dias = pago ? diasEntre(hoy, pago.fecha_vencimiento) : null;
  const pagoTexto = !pago ? '<p class="muted">Sin pagos programados.</p>' : pago.estado === 'vencido' ? `<div class="alerta bad"><span class="tx">Tienes un pago <b>pendiente desde el ${fecha(pago.fecha_vencimiento)}</b> por ${dinero(pago.monto)}. Si ya lo hiciste, avísanos para registrarlo.</span></div>` : dias === 0 ? `<p><b>Tu pago es hoy</b>, ${fecha(pago.fecha_vencimiento)} · ${dinero(pago.monto)}</p>` : `<p><b>Tu próximo pago es en ${dias} día${dias > 1 ? 's' : ''}</b><br>${fechaLarga(pago.fecha_vencimiento)} · ${dinero(pago.monto)}</p>`;

  vista.innerHTML = `<h1 class="titulo">Hola, ${esc(perfil.nombre.split(' ')[0])}</h1><div class="subtitulo">Así va el acompañamiento de ${esc(nombreCorto(hijo.nombre))}.</div>${selectorHijo()}
  <div class="card" style="margin-bottom:12px"><div class="hd"><h3>Bitácora del día</h3><div class="sp"></div><div class="row" style="gap:4px"><button class="btn s" id="bAnt" title="Día anterior">‹</button><span class="small b" id="bFecha"></span><button class="btn s" id="bSig" title="Día siguiente">›</button></div></div><div class="bd lectura" id="zonaBit"></div></div>
  <div class="grid g2">
    <div class="card"><div class="hd"><h3>Monitora educativa</h3></div><div class="bd">${moni ? `<div class="row" style="gap:12px"><span class="ava g">${iniciales(moni.nombre)}</span><div><b>${esc(moni.nombre)}</b><div class="small muted">${esc(F[moni.formacion] || moni.formacion || '')}${moni.especialidades?.length ? ' · ' + esc(moni.especialidades.join(', ')) : ''}</div><div class="small muted">Acompaña a ${esc(nombreCorto(hijo.nombre))} desde el ${fecha(asig.fecha_inicio)}</div></div></div>` : '<p class="muted">Aún no hay monitora asignada.</p>'}</div></div>
    <div class="card"><div class="hd"><h3>Próximo pago</h3><div class="sp"></div><button class="btn s" id="btnPagos">Historial</button></div><div class="bd">${pagoTexto}<div class="small muted">Si tienes dudas sobre tu pago, escríbenos a SHADOW.</div></div></div>
  </div>
  <div class="grid g2" style="margin-top:12px">
    <div class="card"><div class="hd"><h3>Avisos</h3></div><div class="bd" id="avisosFam"><div class="small muted">Calculando…</div></div></div>
    <div class="card"><div class="hd"><h3>Recursos para familias</h3></div><div class="bd"><p class="small muted">Videos y guías sobre crianza, autorregulación, límites y los diagnósticos de nuestros estudiantes. Esta sección se habilita en un paso posterior.</p></div></div>
  </div>`;
  vista.querySelector('#selHijo')?.addEventListener('change', e => { hijo = hijos.find(x => x.id === e.target.value); inicio(); });
  avisosFamilia(perfil.id, hijo).then(av => { const el = document.getElementById('avisosFam'); if (el) el.innerHTML = pintarAvisos(av, { vacio: 'Sin avisos por ahora. Aquí verás recordatorios de pagos, citas y cumpleaños.' }); });
  document.getElementById('btnPagos').onclick = async () => { const ps = await api.pagosDe(hijo.familia.id); modal('Historial de pagos', `<table><thead><tr><th>Vence</th><th>Monto</th><th>Estado</th></tr></thead><tbody>${ps.slice().reverse().map(p => `<tr><td class="mono">${fecha(p.fecha_vencimiento)}</td><td class="mono">${dinero(p.monto)}</td><td>${p.estado === 'pagado' ? `<span class="tag ok">Pagado${p.pagado_en ? ' ' + fecha(p.pagado_en) : ''}</span>` : (p.estado === 'vencido' || p.fecha_vencimiento < hoy) ? '<span class="tag bad">Pendiente · vencido</span>' : '<span class="tag warn">Pendiente</span>'}</td></tr>`).join('') || '<tr><td colspan="3" class="vacio">Sin pagos registrados.</td></tr>'}</tbody></table><div class="small muted" style="margin-top:10px">Los pagos los registra SHADOW. Si ya pagaste y aún aparece pendiente, avísanos.</div>`); };

  const pintarBit = async () => {
    const z = document.getElementById('zonaBit'); const b = enviadas[idx];
    document.getElementById('bAnt').disabled = idx >= enviadas.length - 1; document.getElementById('bSig').disabled = idx <= 0;
    if (!b) { document.getElementById('bFecha').textContent = ''; z.innerHTML = `<div class="vacio">Todavía no hay bitácoras enviadas.</div>`; return; }
    document.getElementById('bFecha').textContent = b.fecha_jornada === hoy ? 'Hoy' : fecha(b.fecha_jornada);
    z.innerHTML = (b.fecha_jornada !== hoy && idx === 0 ? `<div class="alerta" style="margin-bottom:10px"><span class="tx">La bitácora de hoy aún no se ha enviado. Esta es la más reciente (${relativo(b.fecha_jornada)}).</span></div>` : '') + '<div class="vacio">Cargando…</div>';
    const html = await lecturaDe(b, hijo, moni); z.innerHTML = z.querySelector('.alerta')?.outerHTML || ''; z.innerHTML += html;
  };
  document.getElementById('bAnt').onclick = () => { idx++; pintarBit(); }; document.getElementById('bSig').onclick = () => { idx--; pintarBit(); };
  pintarBit();
}

/* ---------- Bitácoras ---------- */
async function bitacoras() {
  if (!hijo) return inicio();
  const bs = (await api.bitacorasDe(hijo.id, { desde: sumarDias(hoyIso(), -90) })).filter(b => b.estado !== 'borrador');
  const asig = await api.asignacionActiva(hijo.id); const moni = asig ? await api.monitora(asig.monitora_id) : null;
  vista.innerHTML = `<h1 class="titulo">Bitácoras de ${esc(nombreCorto(hijo.nombre))}</h1><div class="subtitulo">Últimos 90 días. Toca una para leerla.</div>${selectorHijo()}
  <div class="card"><div class="bd sin"><ul class="lista">${bs.map(b => `<li class="click" data-id="${b.id}"><div class="ava" title="Valoración del día">${b.valoracion_dia || '·'}</div><div class="tx"><b>${fechaLarga(b.fecha_jornada)}</b><div class="m">${b.valoracion_dia ? valoracionTexto(b.valoracion_dia) : ''}${b.resumen_narrativo ? ' · ' + esc(b.resumen_narrativo.slice(0, 80)) + (b.resumen_narrativo.length > 80 ? '…' : '') : ''}</div></div><span class="muted small">${hora(b.enviada_en)}</span></li>`).join('') || '<li class="vacio">Aún no hay bitácoras.</li>'}</ul></div></div>`;
  vista.querySelector('#selHijo')?.addEventListener('change', e => { hijo = hijos.find(x => x.id === e.target.value); bitacoras(); });
  vista.querySelectorAll('[data-id]').forEach(li => li.onclick = async () => { const b = bs.find(x => x.id === li.dataset.id); const m = modal(`Bitácora · ${fecha(b.fecha_jornada)}`, '<div class="vacio">Cargando…</div>'); m.querySelector('#mBd').innerHTML = `<div class="lectura">${await lecturaDe(b, hijo, moni)}</div>`; });
}

/* ---------- Terapias, especialistas, citas y solicitud de reporte ---------- */
async function terapias() {
  if (!hijo) return inicio();
  const sols = (await api.solicitudesDe(perfil.id)).filter(s => s.estudiante_id === hijo.id);
  vista.innerHTML = `<div class="row"><h1 class="titulo">Terapias y citas</h1><div class="sp"></div><button class="btn p" id="btnReporte">Solicitar reporte</button></div><div class="subtitulo">Los profesionales que atienden a ${esc(nombreCorto(hijo.nombre))} y sus próximas citas. Puedes agregar y editar; SHADOW también lo ve para coordinarse contigo.</div>${selectorHijo()}
  <div id="redApoyo">${await htmlRedApoyo(hijo.id, { editable: true, prefijo: 'fa' })}</div>
  <div class="card" style="margin-top:12px"><div class="hd"><h3>Mis solicitudes de reporte</h3><div class="sp"></div><span class="small muted">${sols.length}</span></div><div class="bd sin"><ul class="lista">${sols.map(s => `<li class="click" data-sol="${s.id}"><div class="tx"><b>${esc(s.datos?.motivo || 'Reporte de seguimiento')}</b><div class="m">Pedida el ${fecha(s.creado_en)}${s.datos?.fecha_cita ? ' · para la cita del ' + fecha(s.datos.fecha_cita) : ''}${s.respuesta_direccion ? '<br>SHADOW: ' + esc(s.respuesta_direccion) : ''}</div></div>${tagSol(s.estado)}</li>`).join('') || '<li class="vacio">Aún no has pedido reportes. Pide uno cuando tengas una cita con el neurólogo, terapeuta u otro especialista.</li>'}</ul></div></div>
  <div class="card" style="margin-top:12px"><div class="hd"><h3>Calendario</h3></div><div class="bd" id="calFam"></div></div>`;
  vista.querySelector('#selHijo')?.addEventListener('change', e => { hijo = hijos.find(x => x.id === e.target.value); terapias(); });
  engancharRedApoyo(document.getElementById('redApoyo'), hijo.id, perfil.id, terapias, { prefijo: 'fa' });
  document.getElementById('btnReporte').onclick = () => {
    modal('Solicitar reporte de seguimiento', `<div class="alerta" style="margin-bottom:12px"><span class="tx">Tu solicitud le llega a Dirección de SHADOW como pendiente. Ella revisa la información y prepara el reporte; no se genera automáticamente. Verás aquí el estado.</span></div>
      <div class="form"><div class="f"><label>¿Para qué lo necesitas?</label><input id="sr_m" placeholder="Ej. Cita con el neurólogo"></div><div class="form g2"><div class="f"><label>Fecha de la cita (si aplica)</label><input type="date" id="sr_f"></div><div class="f"><label>Especialista</label><input id="sr_e" placeholder="Nombre o especialidad"></div></div><div class="f"><label>¿Qué te gustaría que incluya?</label><textarea id="sr_d" placeholder="Ej. Un resumen del último mes, cómo va con las transiciones…"></textarea></div></div>`,
      `<button class="btn" data-cerrar>Cancelar</button><button class="btn p" id="sr_ok">Enviar solicitud</button>`);
    document.getElementById('sr_ok').onclick = async () => { if (!val('sr_m')) { toast('Cuéntanos para qué lo necesitas.'); return; } await api.crearSolicitud({ tipo: 'reporte_familia', estudiante_id: hijo.id, datos: { motivo: val('sr_m'), fecha_cita: val('sr_f') || null, especialista: val('sr_e') || null, detalle: val('sr_d') || null } }, perfil.id); cerrarModal(); toast('Solicitud enviada a SHADOW'); terapias(); };
  };
  vista.querySelectorAll('[data-sol]').forEach(li => li.onclick = async () => { const s = sols.find(x => x.id === li.dataset.sol); const hist = await api.historialSolicitud(s.id); modal('Solicitud de reporte', `<div class="row" style="margin-bottom:10px">${tagSol(s.estado)}</div><dl class="dl"><dt>Motivo</dt><dd>${esc(s.datos?.motivo || '')}</dd>${s.datos?.fecha_cita ? `<dt>Cita</dt><dd>${fecha(s.datos.fecha_cita)}</dd>` : ''}${s.datos?.especialista ? `<dt>Especialista</dt><dd>${esc(s.datos.especialista)}</dd>` : ''}${s.datos?.detalle ? `<dt>Detalle</dt><dd>${esc(s.datos.detalle)}</dd>` : ''}</dl>${s.respuesta_direccion ? `<div class="alerta ok" style="margin-top:12px"><span class="tx"><b>SHADOW:</b> ${esc(s.respuesta_direccion)}</span></div>` : ''}<h4 style="margin:14px 0 6px">Seguimiento</h4><ul class="lista">${hist.map(h => `<li style="padding:6px 0"><div class="tx"><b>${ESTADOS_SOL[h.estado]}</b><div class="m">${fecha(h.fecha)} ${hora(h.fecha)}${h.nota ? ' · ' + esc(h.nota) : ''}</div></div></li>`).join('')}</ul>`); });
  montarCalendario(document.getElementById('calFam'), { filtros: false, cargar: async (a, b) => { const [citas, pagos] = await Promise.all([api.citasEntre(a, b), api.pagosDe(hijo.familia.id)]); const out = citas.filter(c => c.estudiante_id === hijo.id).map(c => ({ id: c.id, fecha: c.fecha, hora: c.hora, tipo: 'cita', titulo: c.especialista_nombre || c.especialidad || 'Cita', sub: [c.especialidad, c.lugar_modalidad].filter(Boolean).join(' · ') })); pagos.filter(p => p.fecha_vencimiento >= a && p.fecha_vencimiento <= b).forEach(p => out.push({ id: p.id, fecha: p.fecha_vencimiento, tipo: 'pago', titulo: 'Pago a SHADOW', sub: `${dinero(p.monto)} · ${p.estado}` })); if (hijo.fecha_nacimiento) { const f = a.slice(0, 4) + '-' + hijo.fecha_nacimiento.slice(5); if (f >= a && f <= b) out.push({ id: 'cumple', fecha: f, tipo: 'cumple', titulo: `Cumpleaños de ${nombreCorto(hijo.nombre)}`, sub: '' }); } return out; } });
}

ir('inicio');
