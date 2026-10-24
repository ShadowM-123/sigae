/* SIGAE — perfil de Dirección. */
import * as api from './api.js';
import { exigir } from './auth.js';
import { marco, esc, fecha, fechaLarga, hora, horaCorta, hoyIso, sumarDias, diasEntre, toast, modal, cerrarModal, val, iniciales, nombreCorto, edadTexto, proximoCumple, estadoBitacora, valoracionTexto, dinero, relativo } from './ui.js';
import { renderLectura, porcentajeAvance } from './bitacora.js';

const perfil = await exigir(['direccion', 'asistente']);
let cat = await api.catalogos();
const vista = document.getElementById('vista');
const hoy = hoyIso();

const TABS = [
  { grupo: 'Operación' }, { id: 'inicio', ic: '▦', tx: 'Inicio' }, { id: 'bitacoras', ic: '✎', tx: 'Bitácoras' }, { id: 'estudiantes', ic: '☺', tx: 'Estudiantes' }, { id: 'monitoras', ic: '✦', tx: 'Monitoras' }, { id: 'familias', ic: '⌂', tx: 'Familias' },
  { grupo: 'Seguimiento' }, { id: 'calendario', ic: '▦', tx: 'Calendario', pronto: true }, { id: 'evaluaciones', ic: '◔', tx: 'Evaluaciones', pronto: true }, { id: 'indicadores', ic: '↗', tx: 'Indicadores', pronto: true },
  { grupo: 'Equipo y red' }, { id: 'academia', ic: '▶', tx: 'Academia', pronto: true }, { id: 'materiales', ic: '▤', tx: 'Materiales', pronto: true }, { id: 'especialistas', ic: '✚', tx: 'Especialistas', pronto: true }, { id: 'reclutamiento', ic: '⇄', tx: 'Reclutamiento', pronto: true },
  { grupo: 'Configuración' }, { id: 'catalogos', ic: '☰', tx: 'Catálogos' },
];
const { pintar: pintarTabs } = marco({ perfil, tabs: TABS, activa: 'inicio', onTab: ir, subtitulo: 'Dirección' });
async function ir(tab, params = {}) { pintarTabs(tab); vista.innerHTML = '<div class="vacio">Cargando…</div>'; window.scrollTo(0, 0); await ({ inicio, bitacoras, estudiantes, monitoras, familias, catalogos }[tab] || inicio)(params); }

const TIPO_EVAL = { diagnostica: 'Diagnóstica', intermedia: 'Intermedia', final: 'Final' };
const SENTIR_ATENCION = ['cansada', 'incomoda', 'animo_bajo', 'triste', 'enojada'];

/* ---------- lectura con acciones de revisión ---------- */
async function verBitacora(b, est, moni, alCambiar) {
  const sub = await api.subtablas(b.id, { conConfidencial: true });
  for (const f of sub.fotos) f._url = await api.urlFoto(f.storage_path);
  const lect = await api.lecturasDe([b.id]);
  const puedeRevisar = ['enviada', 'corregida'].includes(b.estado);
  modal(`Bitácora · ${esc(nombreCorto(est.nombre))} · ${fecha(b.fecha_jornada)}`,
    `<div class="row small muted" style="margin-bottom:10px">${estadoBitacora(b.estado)}${b.revisada_en ? `<span>Revisada el ${fecha(b.revisada_en)}</span>` : puedeRevisar ? '<span>Pendiente de revisión</span>' : ''}${lect.length ? `<span>👁 Leída por la familia ${fecha(lect[0].leida_en)} ${hora(lect[0].leida_en)}</span>` : '<span>La familia aún no la abre</span>'}</div>
     ${b.observacion_direccion && b.estado === 'requiere_correccion' ? `<div class="alerta bad" style="margin-bottom:10px"><span class="tx"><b>Corrección pedida:</b> ${esc(b.observacion_direccion)}</span></div>` : ''}
     <div class="lectura">${renderLectura({ b, sub, cat, est, monitora: moni, confidencial: true })}</div>`,
    `<button class="btn" data-cerrar>Cerrar</button><button class="btn" id="mDesc">Descargar PDF</button>${puedeRevisar ? `<button class="btn" id="mCorr">Pedir corrección</button><button class="btn p" id="mOk">Marcar revisada</button>` : ''}`);
  document.getElementById('mDesc').onclick = () => toast('La descarga en PDF (sin la sección confidencial) llega en el paso D.');
  document.getElementById('mOk')?.addEventListener('click', async () => { await api.revisarBitacora(b.id, { revisadaPor: perfil.id }); cerrarModal(); toast('Bitácora marcada como revisada'); alCambiar?.(); });
  document.getElementById('mCorr')?.addEventListener('click', () => {
    modal('Pedir corrección', `<div class="f"><label>¿Qué debe corregir o completar la monitora?</label><textarea id="obs" placeholder="Ej. Falta describir qué pasó antes de la conducta…"></textarea></div><div class="small muted" style="margin-top:8px">La monitora verá este mensaje en su inicio y podrá editar la bitácora. Queda registro de la revisión.</div>`,
      `<button class="btn" data-cerrar>Cancelar</button><button class="btn p" id="mEnviarCorr">Enviar a corrección</button>`);
    document.getElementById('mEnviarCorr').onclick = async () => { const o = val('obs'); if (!o) { toast('Escribe qué debe corregir.'); return; } await api.revisarBitacora(b.id, { estado: 'requiere_correccion', observacion: o, revisadaPor: perfil.id }); cerrarModal(); toast('Enviada a corrección'); alCambiar?.(); };
  });
}

/* ---------- Inicio ---------- */
async function inicio() {
  const [pan, bsHoy, porRevisar, evals, tareas, solicitudes, monis] = await Promise.all([api.panoramaEstudiantes(), api.bitacorasEntre(hoy, hoy), api.bitacorasPorRevisar(), api.evaluacionesTodas(), api.tareas(), api.solicitudesAbiertas(), api.monitoras()]);
  const activos = pan.filter(e => e.asignacion);
  const filas = activos.map(e => { const b = bsHoy.find(x => x.estudiante_id === e.id); const hayJornada = api.diasHabiles(e, hoy, hoy).length > 0; const estado = b ? (b.estado === 'borrador' ? 'bor' : 'ok') : hayJornada ? 'falta' : 'nohay'; return { e, b, estado }; });
  const conJornada = filas.filter(f => f.estado !== 'nohay').length;
  const entregadas = filas.filter(f => f.estado === 'ok').length;
  const cumples = [...pan.map(e => ({ nombre: e.nombre, tipo: 'Estudiante', nac: e.fecha_nacimiento })), ...monis.map(m => ({ nombre: m.nombre, tipo: 'Monitora', nac: m.fecha_nacimiento }))].map(x => ({ ...x, c: proximoCumple(x.nac) })).filter(x => x.c && x.c.dias <= 60).sort((a, b) => a.c.dias - b.c.dias);
  const evalPorEst = e => ['diagnostica', 'intermedia', 'final'].map(t => { const ev = evals.filter(x => x.estudiante_id === e.id && x.tipo === t).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))[0]; if (!ev) return `<span class="tag gray" title="${TIPO_EVAL[t]}">${TIPO_EVAL[t][0]} · sin programar</span>`; if (ev.realizada) return `<span class="tag ok">${TIPO_EVAL[t][0]} · ${fecha(ev.fecha)}</span>`; if (ev.fecha && ev.fecha < hoy) return `<span class="tag bad">${TIPO_EVAL[t][0]} · vencida ${fecha(ev.fecha)}</span>`; return `<span class="tag warn">${TIPO_EVAL[t][0]} · ${ev.fecha ? fecha(ev.fecha) : 'por programar'}</span>`; }).join(' ');
  const pendientes = porRevisar.length + solicitudes.length + tareas.length;
  vista.innerHTML = `<h1 class="titulo">${fechaLarga(hoy)}</h1><div class="subtitulo">Lo que importa hoy, de un vistazo.</div>
  <div class="grid g4" style="margin-bottom:14px">
    <div class="card kpi"><div class="l">Bitácoras de hoy</div><div class="v">${entregadas}<span class="muted" style="font-size:16px">/${conJornada}</span></div><div class="d ${entregadas === conJornada ? 'bien' : ''}">${!conJornada ? 'Hoy no hay jornada escolar' : conJornada - entregadas ? `${conJornada - entregadas} por entregar` : 'Todas entregadas'}</div></div>
    <div class="card kpi"><div class="l">Por revisar</div><div class="v">${porRevisar.length}</div><div class="d">bitácoras enviadas sin revisar</div></div>
    <div class="card kpi"><div class="l">Pendientes</div><div class="v">${pendientes}</div><div class="d">${solicitudes.length} solicitud${solicitudes.length === 1 ? '' : 'es'} · ${tareas.length} tarea${tareas.length === 1 ? '' : 's'}</div></div>
    <div class="card kpi"><div class="l">Cumpleaños próximos</div><div class="v">${cumples.filter(c => c.c.dias <= 30).length}</div><div class="d">en los próximos 30 días</div></div>
  </div>
  <div class="grid g-21">
    <div class="col" style="gap:14px">
      <div class="card"><div class="hd"><h3>Bitácoras de hoy</h3><div class="sp"></div><span class="small muted">Por estudiante y monitora</span></div><div class="bd estado-hoy">
        ${filas.map(({ e, b, estado }) => `<div class="fila ${estado}"><div><b>${esc(nombreCorto(e.nombre))}</b> <span class="muted small">· ${esc(nombreCorto(e.monitora?.nombre || ''))}</span><div class="small">${estado === 'ok' ? `Entregada a las ${hora(b.enviada_en)} · valoración ${b.valoracion_dia}/5${b.revisada_en ? ' · revisada' : ''}` : estado === 'bor' ? `En borrador · ${porcentajeAvance(b)} % completo` : estado === 'nohay' ? 'Sin jornada escolar hoy' : 'Sin entregar'}</div></div>
          <div class="row" style="gap:6px">${estado === 'ok' ? `<button class="btn s" data-ver="${b.id}">Ver</button>` : estado === 'nohay' ? '' : `<button class="btn s" data-recordar="${e.monitora?.id}">Recordar</button>`}</div></div>`).join('') || '<div class="vacio">No hay estudiantes con monitora asignada.</div>'}
      </div></div>
      <div class="card"><div class="hd"><h3>Evaluaciones</h3><div class="sp"></div><span class="small muted">D = diagnóstica · I = intermedia · F = final</span></div><div class="bd sin"><ul class="lista">${pan.map(e => `<li><div class="tx"><b>${esc(nombreCorto(e.nombre))}</b><div class="m" style="margin-top:4px">${evalPorEst(e)}</div></div></li>`).join('')}</ul></div></div>
    </div>
    <div class="col" style="gap:14px">
      <div class="card"><div class="hd"><h3>Pendientes</h3><div class="sp"></div><button class="btn s" id="btnTarea">＋ Tarea</button></div><div class="bd sin"><ul class="lista">
        ${porRevisar.length ? `<li class="click" data-tab="bitacoras"><div class="tx"><b>${porRevisar.length} bitácora${porRevisar.length > 1 ? 's' : ''} por revisar</b><div class="m">La más antigua: ${fecha(porRevisar[porRevisar.length - 1].fecha_jornada)}</div></div><span class="tag warn">Revisar</span></li>` : ''}
        ${solicitudes.map(s => { const e = pan.find(x => x.id === s.estudiante_id); return `<li><div class="tx"><b>${{ reporte_familia: 'Solicitud de reporte (familia)', reporte_especialista: 'Solicitud de reporte (especialista)', visita_escolar: 'Solicitud de visita escolar' }[s.tipo]}</b><div class="m">${esc(nombreCorto(e?.nombre || ''))} · ${esc(s.datos?.motivo || '')} · ${relativo(s.creado_en.slice(0, 10))}</div></div><span class="tag">${{ recibida: 'Recibida', en_revision: 'En revisión', info_adicional: 'Falta info', aprobada_en_proceso: 'En proceso' }[s.estado]}</span></li>`; }).join('')}
        ${tareas.map(t => { const e = pan.find(x => x.id === t.estudiante_id); return `<li><input type="checkbox" data-tarea="${t.id}" title="Marcar hecha"><div class="tx"><b>${esc(t.titulo)}</b><div class="m">${t.fecha ? fecha(t.fecha) + ' · ' + relativo(t.fecha) : ''}${e ? ' · ' + esc(nombreCorto(e.nombre)) : ''}</div></div>${t.fecha && t.fecha < hoy ? '<span class="tag bad">Atrasada</span>' : t.fecha === hoy ? '<span class="tag warn">Hoy</span>' : ''}</li>`; }).join('')}
        ${!pendientes ? '<li class="vacio">Sin pendientes. 🎉</li>' : ''}</ul></div></div>
      <div class="card"><div class="hd"><h3>Cumpleaños próximos</h3></div><div class="bd sin"><ul class="lista">${cumples.map(c => `<li><span class="ava">${c.c.dias === 0 ? '🎂' : iniciales(c.nombre)}</span><div class="tx"><b>${esc(c.nombre)}</b><div class="m">${c.tipo} · ${fecha(c.c.fecha)}</div></div><span class="tag ${c.c.dias <= 3 ? 'bad' : c.c.dias <= 7 ? 'warn' : c.c.dias <= 30 ? '' : 'gray'}">${c.c.dias === 0 ? '¡Hoy!' : `en ${c.c.dias} días`}</span></li>`).join('') || '<li class="vacio">Nadie cumple años en los próximos 60 días.</li>'}</ul></div><div class="bd small muted" style="border-top:1px solid var(--line)">Los recordatorios se envían un mes, una semana y tres días antes.</div></div>
    </div>
  </div>`;
  vista.querySelectorAll('[data-ver]').forEach(b => b.onclick = async () => { const bit = bsHoy.find(x => x.id === b.dataset.ver); const e = pan.find(x => x.id === bit.estudiante_id); verBitacora(bit, e, e.monitora, inicio); });
  vista.querySelectorAll('[data-recordar]').forEach(b => b.onclick = () => toast('Recordatorio enviado a la monitora (en la versión real: aviso en la app y WhatsApp).'));
  vista.querySelector('[data-tab="bitacoras"]')?.addEventListener('click', () => ir('bitacoras', { estado: 'porrevisar' }));
  vista.querySelectorAll('[data-tarea]').forEach(c => c.onchange = async () => { await api.guardarTarea({ id: c.dataset.tarea, estado: 'hecha' }); toast('Tarea hecha'); inicio(); });
  document.getElementById('btnTarea').onclick = () => { modal('Nueva tarea', `<div class="form"><div class="f"><label>Qué hay que hacer</label><input id="t_t"></div><div class="form g2"><div class="f"><label>Fecha</label><input type="date" id="t_f" value="${hoy}"></div><div class="f"><label>Tipo</label><select id="t_tipo"><option value="general">General</option><option value="visita_escolar">Visita escolar</option><option value="revision">Revisión</option><option value="reunion">Reunión</option></select></div></div><div class="f"><label>Estudiante (opcional)</label><select id="t_e"><option value="">—</option>${pan.map(e => `<option value="${e.id}">${esc(e.nombre)}</option>`).join('')}</select></div></div>`, `<button class="btn" data-cerrar>Cancelar</button><button class="btn p" id="t_ok">Guardar</button>`); document.getElementById('t_ok').onclick = async () => { if (!val('t_t')) { toast('Escribe la tarea.'); return; } await api.guardarTarea({ titulo: val('t_t'), fecha: val('t_f') || null, tipo: val('t_tipo'), estudiante_id: val('t_e') || null, estado: 'pendiente' }); cerrarModal(); inicio(); }; };
}

/* ---------- Bitácoras ---------- */
async function bitacoras(params = {}) {
  const pan = await api.panoramaEstudiantes(); const monis = await api.monitoras();
  const filtro = { est: params.est || '', estado: params.estado || '', desde: params.desde || sumarDias(hoy, -14) };
  const pintar = async () => {
    let bs = await api.bitacorasEntre(filtro.desde, hoy);
    if (filtro.est) bs = bs.filter(b => b.estudiante_id === filtro.est);
    if (filtro.estado === 'porrevisar') bs = bs.filter(b => ['enviada', 'corregida'].includes(b.estado) && !b.revisada_en); else if (filtro.estado) bs = bs.filter(b => b.estado === filtro.estado);
    const lect = await api.lecturasDe(bs.map(b => b.id));
    document.getElementById('tablaBit').innerHTML = `<div class="tabla-wrap"><table><thead><tr><th>Jornada</th><th>Estudiante</th><th>Monitora</th><th>Día</th><th>Estado</th><th>Enviada</th><th>Revisión</th><th>Familia</th><th></th></tr></thead><tbody>
      ${bs.map(b => { const e = pan.find(x => x.id === b.estudiante_id); const m = monis.find(x => x.id === b.monitora_id); const l = lect.find(x => x.bitacora_id === b.id); return `<tr class="click" data-id="${b.id}"><td class="mono">${fecha(b.fecha_jornada)}</td><td><b>${esc(nombreCorto(e?.nombre || ''))}</b></td><td>${esc(nombreCorto(m?.nombre || ''))}</td><td>${b.valoracion_dia ? `${b.valoracion_dia}/5` : '—'}</td><td>${estadoBitacora(b.estado)}</td><td class="small muted">${b.enviada_en ? fecha(b.enviada_en) + ' ' + hora(b.enviada_en) : '—'}</td><td class="small">${b.revisada_en ? `<span class="tag ok">Revisada</span>` : ['enviada', 'corregida'].includes(b.estado) ? '<span class="tag warn">Pendiente</span>' : ''}</td><td class="small">${l ? '👁 ' + fecha(l.leida_en) : '<span class="muted">—</span>'}</td><td><button class="btn s">Abrir</button></td></tr>`; }).join('') || '<tr><td colspan="9" class="vacio">Sin bitácoras con ese filtro.</td></tr>'}</tbody></table></div>`;
    document.querySelectorAll('#tablaBit tr[data-id]').forEach(tr => tr.onclick = () => { const b = bs.find(x => x.id === tr.dataset.id); const e = pan.find(x => x.id === b.estudiante_id); verBitacora(b, e, monis.find(x => x.id === b.monitora_id), pintar); });
  };
  vista.innerHTML = `<h1 class="titulo">Bitácoras</h1><div class="subtitulo">Todas las jornadas registradas. Abre una para leerla completa, marcarla revisada o pedir corrección.</div>
  <div class="row" style="margin-bottom:12px"><select class="f" id="fEst" style="padding:8px 10px;border:1px solid var(--line-2);border-radius:8px"><option value="">Todos los estudiantes</option>${pan.map(e => `<option value="${e.id}" ${filtro.est === e.id ? 'selected' : ''}>${esc(e.nombre)}</option>`).join('')}</select>
    <select id="fEstado" style="padding:8px 10px;border:1px solid var(--line-2);border-radius:8px"><option value="">Cualquier estado</option><option value="porrevisar" ${filtro.estado === 'porrevisar' ? 'selected' : ''}>Por revisar</option><option value="enviada">Enviadas</option><option value="borrador">Borradores</option><option value="requiere_correccion">Requieren corrección</option><option value="corregida">Corregidas</option></select>
    <label class="small muted">Desde <input type="date" id="fDesde" value="${filtro.desde}" style="padding:7px 10px;border:1px solid var(--line-2);border-radius:8px"></label></div>
  <div class="card"><div class="bd sin" id="tablaBit"></div></div>`;
  document.getElementById('fEst').onchange = e => { filtro.est = e.target.value; pintar(); }; document.getElementById('fEstado').onchange = e => { filtro.estado = e.target.value; pintar(); }; document.getElementById('fDesde').onchange = e => { filtro.desde = e.target.value; pintar(); };
  pintar();
}

/* ---------- Estudiantes ---------- */
async function estudiantes(params = {}) {
  const pan = await api.panoramaEstudiantes();
  vista.innerHTML = `<div class="row"><h1 class="titulo">Estudiantes</h1><div class="sp"></div><button class="btn p" id="btnNuevoEst">＋ Nuevo estudiante</button></div><div class="subtitulo">${pan.length} expedientes activos.</div>
  <div class="card"><div class="bd sin"><div class="tabla-wrap"><table><thead><tr><th>Estudiante</th><th>Escuela</th><th>Horario</th><th>Necesidades</th><th>Monitora</th><th>Familia</th><th></th></tr></thead><tbody>
  ${pan.map(e => `<tr class="click" data-id="${e.id}"><td><b>${esc(e.nombre)}</b><div class="small muted">${edadTexto(e.fecha_nacimiento)} · ${esc(e.grado || '')}</div></td><td class="small">${esc(e.escuela || '')}</td><td class="small mono">${horaCorta(e.hora_entrada)}–${horaCorta(e.hora_salida)}</td><td>${(e.necesidades_apoyo || []).slice(0, 2).map(n => `<span class="tag gray">${esc(n)}</span>`).join(' ')}</td><td>${e.monitora ? esc(nombreCorto(e.monitora.nombre)) : '<span class="tag warn">Sin asignar</span>'}</td><td class="small">${esc(e.familia?.nombre_familia || '—')}</td><td><button class="btn s">Abrir</button></td></tr>`).join('')}</tbody></table></div></div></div>`;
  vista.querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => verEstudiante(tr.dataset.id));
  document.getElementById('btnNuevoEst').onclick = () => editarEstudiante(null);
  if (params.id) verEstudiante(params.id);
}
async function verEstudiante(id) {
  const [e, asigs, monis, tutores, objetivos, evals, bs] = await Promise.all([api.estudiante(id), api.asignacionesDe(id), api.monitoras(), api.estudiante(id).then(x => api.tutoresDe(x.familia_id)), api.objetivosDe(id), api.evaluacionesDe(id), api.bitacorasDe(id, { limite: 10 })]);
  const fam = await api.familia(e.familia_id); const act = asigs.find(a => a.activa); const moni = act ? monis.find(m => m.id === act.monitora_id) : null;
  const dias = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  modal(`${esc(e.nombre)}`, `
    <div class="row" style="margin-bottom:10px"><span class="ava g">${iniciales(e.nombre)}</span><div><div class="small muted">${edadTexto(e.fecha_nacimiento)} · nació el ${fecha(e.fecha_nacimiento)} · en SHADOW desde ${fecha(e.fecha_inicio_servicio)}</div><div>${esc(e.escuela)} · ${esc(e.grado)} ${e.grupo ? '· grupo ' + esc(e.grupo) : ''} · ${horaCorta(e.hora_entrada)}–${horaCorta(e.hora_salida)} · ${(e.dias_asistencia || []).map(d => dias[d]).join(' ')}</div></div></div>
    <div class="grid g2">
      <div class="card"><div class="hd"><h3>Monitora</h3><div class="sp"></div><button class="btn s" id="eCambiar">${moni ? 'Cambiar' : 'Asignar'}</button></div><div class="bd">${moni ? `<b>${esc(moni.nombre)}</b><div class="small muted">Desde el ${fecha(act.fecha_inicio)}</div>` : '<span class="tag warn">Sin monitora asignada</span>'}
        ${asigs.filter(a => !a.activa).length ? `<div class="small muted" style="margin-top:8px"><b>Historial:</b><br>${asigs.filter(a => !a.activa).map(a => `${esc(nombreCorto(monis.find(m => m.id === a.monitora_id)?.nombre || ''))} · ${fecha(a.fecha_inicio)} → ${fecha(a.fecha_fin)}${a.motivo_cambio ? ' · ' + esc(a.motivo_cambio) : ''}`).join('<br>')}</div>` : ''}</div></div>
      <div class="card"><div class="hd"><h3>Familia</h3></div><div class="bd"><b>${esc(fam?.nombre_familia || '—')}</b><div class="small">${tutores.map(t => `${esc(t.nombre)} (${esc(t.parentesco || '')}) · ${esc(t.telefono || '')}`).join('<br>')}</div><div class="small muted" style="margin-top:6px">${esc(e.dinamica_familiar || '')}</div><div class="small muted">Compañeros en el salón: ${e.companeros_salon ?? '—'}</div></div></div>
      <div class="card"><div class="hd"><h3>Perfil de desarrollo</h3></div><div class="bd small"><b>${esc(e.diagnostico || '')}</b><p>${esc(e.perfil_desarrollo || '')}</p>${(e.necesidades_apoyo || []).map(n => `<span class="tag gray">${esc(n)}</span> `).join('')}</div></div>
      <div class="card"><div class="hd"><h3>Objetivos</h3></div><div class="bd sin"><ul class="lista">${objetivos.map(o => `<li style="padding:8px 14px"><div class="tx"><b>${esc(o.descripcion)}</b><div class="m">${esc(o.estrategia || '')}</div></div><span class="tag ${o.estado === 'alcanzado' ? 'ok' : ''}">${{ en_proceso: 'En proceso', alcanzado: 'Alcanzado', pausado: 'Pausado' }[o.estado]}</span></li>`).join('') || '<li class="vacio">Sin objetivos.</li>'}</ul></div></div>
      <div class="card"><div class="hd"><h3>Evaluaciones</h3></div><div class="bd sin"><ul class="lista">${evals.map(ev => `<li style="padding:8px 14px"><div class="tx"><b>${TIPO_EVAL[ev.tipo]}</b><div class="m">${ev.realizada ? `Aplicada el ${fecha(ev.fecha)}` : ev.fecha ? `Programada ${fecha(ev.fecha)}${ev.fecha < hoy ? ' · <span class="tag bad">vencida</span>' : ''}` : 'Por programar'}${ev.observaciones ? ' · ' + esc(ev.observaciones) : ''}</div></div>${ev.realizada ? '<span class="tag ok">Hecha</span>' : '<span class="tag warn">Pendiente</span>'}</li>`).join('') || '<li class="vacio">Sin evaluaciones.</li>'}</ul></div></div>
      <div class="card"><div class="hd"><h3>Últimas bitácoras</h3><div class="sp"></div><button class="btn s" id="eDesc">Descargar semana / mes</button></div><div class="bd sin"><ul class="lista">${bs.map(b => `<li class="click" data-bit="${b.id}" style="padding:8px 14px"><div class="tx"><b>${fecha(b.fecha_jornada)}</b><div class="m">${b.valoracion_dia ? b.valoracion_dia + '/5 · ' : ''}${esc((b.resumen_narrativo || '').slice(0, 70))}</div></div>${estadoBitacora(b.estado)}</li>`).join('') || '<li class="vacio">Sin bitácoras.</li>'}</ul></div></div>
    </div>`, `<button class="btn" data-cerrar>Cerrar</button><button class="btn" id="eEditar">Editar expediente</button>`);
  document.getElementById('eEditar').onclick = () => editarEstudiante(e);
  document.getElementById('eDesc').onclick = () => toast('Las descargas semanal y mensual con resumen llegan en el paso D.');
  document.querySelectorAll('[data-bit]').forEach(li => li.onclick = () => { const b = bs.find(x => x.id === li.dataset.bit); verBitacora(b, e, monis.find(m => m.id === b.monitora_id), () => verEstudiante(id)); });
  document.getElementById('eCambiar').onclick = () => {
    modal(moni ? 'Cambiar monitora' : 'Asignar monitora', `<div class="form"><div class="f"><label>Nueva monitora</label><select id="cm_m">${monis.filter(m => m.id !== moni?.id && (m.estado || 'activa') === 'activa').map(m => `<option value="${m.id}">${esc(m.nombre)} · ${esc((m.especialidades || []).join(', '))}</option>`).join('')}</select></div>${moni ? `<div class="f"><label>Motivo del cambio</label><input id="cm_motivo" placeholder="Ej. cambio de horario de la monitora"></div>` : ''}<div class="alerta"><span class="tx small">La monitora anterior pierde el acceso al expediente desde hoy. Sus bitácoras, evaluaciones y reportes se conservan tal cual. La nueva ve el expediente completo para dar continuidad.</span></div></div>`,
      `<button class="btn" data-cerrar>Cancelar</button><button class="btn p" id="cm_ok">Confirmar</button>`);
    document.getElementById('cm_ok').onclick = async () => { await api.cambiarMonitora(id, val('cm_m'), val('cm_motivo')); cerrarModal(); toast('Asignación actualizada'); estudiantes({ id }); };
  };
}
function editarEstudiante(e) {
  const v = e || {}; const fams = [];
  api.familias().then(fs => { const sel = document.getElementById('ed_fam'); if (sel) sel.innerHTML = fs.map(f => `<option value="${f.id}" ${v.familia_id === f.id ? 'selected' : ''}>${esc(f.nombre_familia)}</option>`).join(''); });
  modal(e ? 'Editar expediente' : 'Nuevo estudiante', `<div class="form g2">
    <div class="f full"><label>Nombre completo</label><input id="ed_nombre" value="${esc(v.nombre || '')}"></div>
    <div class="f"><label>Fecha de nacimiento</label><input type="date" id="ed_nac" value="${v.fecha_nacimiento || ''}"></div><div class="f"><label>Familia</label><select id="ed_fam"></select></div>
    <div class="f"><label>Escuela</label><input id="ed_esc" value="${esc(v.escuela || '')}"></div><div class="f"><label>Dirección de la escuela</label><input id="ed_dir" value="${esc(v.direccion_escuela || '')}"></div>
    <div class="f"><label>Grado</label><input id="ed_grado" value="${esc(v.grado || '')}"></div><div class="f"><label>Grupo</label><input id="ed_grupo" value="${esc(v.grupo || '')}"></div>
    <div class="f"><label>Hora de entrada</label><input type="time" id="ed_he" value="${horaCorta(v.hora_entrada) || '08:00'}"></div><div class="f"><label>Hora de salida</label><input type="time" id="ed_hs" value="${horaCorta(v.hora_salida) || '14:00'}"></div>
    <div class="f"><label>Recreo inicio</label><input type="time" id="ed_ri" value="${horaCorta(v.hora_recreo_inicio) || ''}"></div><div class="f"><label>Recreo fin</label><input type="time" id="ed_rf" value="${horaCorta(v.hora_recreo_fin) || ''}"></div>
    <div class="f"><label>Zona</label><input id="ed_zona" value="${esc(v.zona || '')}"></div><div class="f"><label>Compañeros en el salón</label><input type="number" id="ed_comp" value="${v.companeros_salon ?? ''}"></div>
    <div class="f full"><label>Diagnóstico</label><input id="ed_diag" value="${esc(v.diagnostico || '')}"></div>
    <div class="f full"><label>Perfil de desarrollo</label><textarea id="ed_perfil">${esc(v.perfil_desarrollo || '')}</textarea></div>
    <div class="f full"><label>Necesidades de apoyo (una por línea)</label><textarea id="ed_nec">${esc((v.necesidades_apoyo || []).join('\n'))}</textarea></div>
    <div class="f full"><label>Dinámica familiar</label><textarea id="ed_din">${esc(v.dinamica_familiar || '')}</textarea></div>
    <div class="f full"><label class="chk"><input type="checkbox" id="ed_foto" ${v.foto_autorizada ? 'checked' : ''}> La familia autoriza el uso de la fotografía del estudiante</label></div></div>`,
    `<button class="btn" data-cerrar>Cancelar</button><button class="btn p" id="ed_ok">Guardar</button>`);
  document.getElementById('ed_ok').onclick = async () => {
    if (!val('ed_nombre')) { toast('Falta el nombre.'); return; }
    const fila = { ...(e ? { id: e.id } : { activo: true, fecha_inicio_servicio: hoy }), nombre: val('ed_nombre'), fecha_nacimiento: val('ed_nac') || null, familia_id: val('ed_fam') || null, escuela: val('ed_esc'), direccion_escuela: val('ed_dir'), grado: val('ed_grado'), grupo: val('ed_grupo'), hora_entrada: val('ed_he') || null, hora_salida: val('ed_hs') || null, hora_recreo_inicio: val('ed_ri') || null, hora_recreo_fin: val('ed_rf') || null, zona: val('ed_zona'), companeros_salon: val('ed_comp') ? Number(val('ed_comp')) : null, diagnostico: val('ed_diag'), perfil_desarrollo: val('ed_perfil'), necesidades_apoyo: val('ed_nec').split('\n').map(x => x.trim()).filter(Boolean), dinamica_familiar: val('ed_din'), foto_autorizada: val('ed_foto') };
    const g = await api.guardarEstudiante(fila); cerrarModal(); toast('Expediente guardado'); estudiantes({ id: g.id });
  };
}

/* ---------- Monitoras ---------- */
async function monitoras(params = {}) {
  const [monis, asigs, pan] = await Promise.all([api.monitoras(), api.asignacionesActivas(), api.panoramaEstudiantes()]);
  const desde = sumarDias(hoy, -30); const [bs, acc] = await Promise.all([api.bitacorasEntre(desde, hoy), api.accesosDe(monis.map(m => m.id), desde + 'T00:00:00')]);
  vista.innerHTML = `<h1 class="titulo">Monitoras educativas</h1><div class="subtitulo">Equipo activo, sus estudiantes, entregas y accesos. El avance en la Academia llega en un paso posterior.</div>
  <div class="card"><div class="bd sin"><div class="tabla-wrap"><table><thead><tr><th>Monitora</th><th>Formación</th><th>Estudiante(s)</th><th>Bitácoras 30 d</th><th>Accesos 30 d</th><th>Último acceso</th><th>Bienestar</th><th></th></tr></thead><tbody>
  ${monis.map(m => { const es = asigs.filter(a => a.monitora_id === m.id).map(a => pan.find(e => e.id === a.estudiante_id)).filter(Boolean); const nb = bs.filter(b => b.monitora_id === m.id && b.estado !== 'borrador').length; const na = acc.filter(a => a.perfil_id === m.id); const ult = na.map(a => a.fecha_hora).sort().pop(); return `<tr class="click" data-id="${m.id}"><td><b>${esc(m.nombre)}</b><div class="small muted">Desde ${fecha(m.fecha_ingreso)}</div></td><td class="small">${esc(cat._etiqueta('formacion_academica', m.formacion))}${m.tiene_cedula ? ' · cédula' : ''}</td><td class="small">${es.map(e => esc(nombreCorto(e.nombre))).join('<br>') || '<span class="tag gray">Sin asignar</span>'}</td><td class="mono">${nb}</td><td class="mono">${na.length}</td><td class="small muted">${ult ? fecha(ult) + ' ' + hora(ult) : '—'}</td><td id="bien-${m.id}"><span class="muted small">…</span></td><td><button class="btn s">Ver</button></td></tr>`; }).join('')}</tbody></table></div></div></div>`;
  vista.querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => verMonitora(tr.dataset.id));
  for (const m of monis) { const s = await api.sentirDeMonitora(m.id, sumarDias(hoy, -14)); const n = s.filter(x => (x.sentimientos || []).some(k => SENTIR_ATENCION.includes(k))).length; const el = document.getElementById('bien-' + m.id); if (el) el.innerHTML = n >= 4 ? `<span class="tag conf">Observar · ${n}/${s.length}</span>` : s.length ? '<span class="tag ok">Sin señales</span>' : '<span class="muted small">Sin datos</span>'; }
  if (params.id) verMonitora(params.id);
}
async function verMonitora(id) {
  const [m, asigs, pan] = await Promise.all([api.monitora(id), api.asignacionesActivas(), api.panoramaEstudiantes()]);
  const es = asigs.filter(a => a.monitora_id === id).map(a => pan.find(e => e.id === a.estudiante_id)).filter(Boolean);
  const desde30 = sumarDias(hoy, -30); const sentir = await api.sentirDeMonitora(id, desde30); const acc = await api.accesosDe([id], sumarDias(hoy, -30) + 'T00:00:00');
  const conteo = {}; sentir.forEach(s => (s.sentimientos || []).forEach(k => conteo[k] = (conteo[k] || 0) + 1)); const total = sentir.length || 1;
  const ultimas = sentir.slice(0, 10); const alerta = ultimas.filter(x => (x.sentimientos || []).some(k => SENTIR_ATENCION.includes(k))).length;
  const comentarios = sentir.filter(s => s.comentario);
  modal(esc(m.nombre), `
    <div class="grid g2">
      <div class="card"><div class="hd"><h3>Datos</h3></div><div class="bd small"><b>${esc(cat._etiqueta('formacion_academica', m.formacion))}</b>${m.tiene_titulo ? ' · con título' : ''}${m.tiene_cedula ? ` · cédula ${esc(m.cedula || '')}` : ''}<p>${esc(m.experiencia || '')}</p><p>Especialidades: ${(m.especialidades || []).map(x => `<span class="tag gray">${esc(x)}</span>`).join(' ')}</p><p>Zonas: ${(m.zonas || []).join(', ')} · Tel. ${esc(m.telefono || '')} · ${esc(m.correo || '')}</p><p class="muted">Ingreso: ${fecha(m.fecha_ingreso)} · Cumpleaños: ${fecha(m.fecha_nacimiento)}</p></div></div>
      <div class="card"><div class="hd"><h3>Estudiantes y actividad</h3></div><div class="bd small">${es.map(e => `<div><b>${esc(e.nombre)}</b> · ${esc(e.escuela)}</div>`).join('') || '<span class="tag gray">Sin asignación</span>'}<p style="margin-top:8px">Accesos en 30 días: <b>${acc.length}</b>${acc.length ? ` · último ${fecha(acc.map(a => a.fecha_hora).sort().pop())}` : ''}</p><p class="muted">Academia SHADOW: avance, intentos y fechas de acceso llegan en el paso F.</p></div></div>
    </div>
    <div class="card" style="margin-top:12px"><div class="hd"><h3>¿Cómo se ha sentido? <span class="tag conf">Confidencial</span></h3><div class="sp"></div><span class="small muted">Últimos 30 días · ${sentir.length} jornadas</span></div><div class="bd">
      ${alerta >= 4 ? `<div class="alerta conf" style="margin-bottom:12px"><span class="tx"><b>Tendencia a observar:</b> en ${alerta} de sus últimas ${ultimas.length} jornadas reportó cansancio, incomodidad, ánimo bajo, tristeza o enojo. Puede ser momento de una conversación de acompañamiento.</span></div>` : '<div class="alerta ok" style="margin-bottom:12px"><span class="tx">Sin señales repetidas en las últimas jornadas.</span></div>'}
      <div class="grid g2"><div><div class="small b" style="margin-bottom:6px">Frecuencia</div><div class="tend">${Object.entries(conteo).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<div class="r"><span>${esc(cat._etiqueta('sentir_monitora', k))}</span><div class="tr"><i style="width:${Math.round(100 * n / total)}%;${SENTIR_ATENCION.includes(k) ? '' : 'background:var(--green)'}"></i></div><span class="mono muted">${n}</span></div>`).join('') || '<span class="muted small">Sin registros.</span>'}</div></div>
      <div><div class="small b" style="margin-bottom:6px">Línea de tiempo (una barra por jornada; morado = señal a observar)</div><div class="serie">${[...sentir].reverse().map(s => `<i class="${(s.sentimientos || []).some(k => SENTIR_ATENCION.includes(k)) ? 'c' : 'ok'}" style="height:${30 + 60 * Math.min(1, (s.sentimientos || []).length / 3)}%" title="${fecha(s.fecha)}: ${(s.sentimientos || []).map(k => cat._etiqueta('sentir_monitora', k)).join(', ')}"></i>`).join('')}</div></div></div>
      ${comentarios.length ? `<div class="small b" style="margin:12px 0 6px">Comentarios que decidió compartir</div><ul class="lista">${comentarios.map(c => `<li style="padding:8px 0"><div class="tx"><div class="m">${fecha(c.fecha)} · ${(c.sentimientos || []).map(k => cat._etiqueta('sentir_monitora', k)).join(', ')}</div>${esc(c.comentario)}</div></li>`).join('')}</ul>` : ''}
      <div class="small muted" style="margin-top:10px">Esta información es para acompañar al equipo, no para calificarlo. No la ven las familias ni los especialistas y no se incluye en ninguna descarga.</div>
    </div></div>`);
}

/* ---------- Familias ---------- */
async function familias() {
  const [fams, pan] = await Promise.all([api.familias(), api.panoramaEstudiantes()]);
  const desde = sumarDias(hoy, -14); const bs = await api.bitacorasEntre(desde, hoy); const lect = await api.lecturasDe(bs.map(b => b.id));
  const filas = [];
  for (const f of fams) {
    const tut = await api.tutoresDe(f.id); const es = pan.filter(e => e.familia_id === f.id); const acc = await api.accesosDe(tut.map(t => t.id), sumarDias(hoy, -30) + 'T00:00:00'); const pago = await api.proximoPago(f.id);
    const env = bs.filter(b => es.some(e => e.id === b.estudiante_id) && b.estado !== 'borrador'); const leidas = env.filter(b => lect.some(l => l.bitacora_id === b.id && tut.some(t => t.id === l.perfil_id))).length;
    filas.push({ f, tut, es, acc, pago, env: env.length, leidas });
  }
  vista.innerHTML = `<h1 class="titulo">Familias</h1><div class="subtitulo">Quién ha entrado, si leen las bitácoras y cómo van sus pagos.</div>
  <div class="card"><div class="bd sin"><div class="tabla-wrap"><table><thead><tr><th>Familia</th><th>Tutores</th><th>Estudiante(s)</th><th>Accesos 30 d</th><th>Bitácoras leídas (14 d)</th><th>Pago</th></tr></thead><tbody>
  ${filas.map(({ f, tut, es, acc, pago, env, leidas }) => { const d = pago ? diasEntre(hoy, pago.fecha_vencimiento) : null; return `<tr><td><b>${esc(f.nombre_familia)}</b><div class="small muted">Día de pago: ${f.dia_de_pago ?? '—'} · ${dinero(f.monto_mensual)}</div></td><td class="small">${tut.map(t => `${esc(t.nombre)} <span class="muted">(${esc(t.parentesco || '')})</span>`).join('<br>')}</td><td class="small">${es.map(e => esc(nombreCorto(e.nombre))).join('<br>')}</td><td>${acc.length ? `<span class="tag ok">${acc.length} veces</span>` : '<span class="tag warn">No ha entrado</span>'}</td><td><span class="tag ${env && leidas / env >= .7 ? 'ok' : leidas ? 'warn' : 'gray'}">${leidas}/${env}</span></td><td class="small">${!pago ? '—' : pago.estado === 'vencido' ? `<span class="tag bad">Vencido ${fecha(pago.fecha_vencimiento)}</span>` : `<span class="tag ${d <= 3 ? 'warn' : ''}">Próximo ${fecha(pago.fecha_vencimiento)} · en ${d} d</span>`}</td></tr>`; }).join('')}</tbody></table></div></div></div>
  <div class="small muted" style="margin-top:10px">Registrar pagos y editar fechas por familia: paso C.</div>`;
}

/* ---------- Catálogos ---------- */
async function catalogos(params = {}) {
  const todos = await api.todosCatalogos(); const tipos = [...new Set(todos.map(c => c.tipo))];
  const NOMBRES = { lonche: 'Alimentación en el recreo', uso_bano: 'Uso del baño · qué hizo', conducta: 'Conductas que requieren seguimiento', actividades_realizadas: 'Realización de actividades', participacion: 'Participación con la maestra', estado_animo_estudiante: 'Estado de ánimo del estudiante', sentir_monitora: '¿Cómo me sentí como monitora?', valor_bloque: 'Trabajo por periodo de 30 min', formacion_academica: 'Formación académica', dimension_evaluacion: 'Dimensiones de evaluación', como_se_entero: '¿Cómo se enteró de la vacante?' };
  const tipo = params.tipo || tipos[0];
  const items = todos.filter(c => c.tipo === tipo).sort((a, b) => a.orden - b.orden);
  vista.innerHTML = `<h1 class="titulo">Catálogos</h1><div class="subtitulo">Las listas de opciones que usan los formularios. Cámbialas aquí sin tocar el sistema; los registros anteriores conservan su valor.</div>
  <div class="grid g-12" style="grid-template-columns:260px 1fr">
    <div class="card"><div class="bd sin"><ul class="lista">${tipos.map(t => `<li class="click ${t === tipo ? 'b' : ''}" data-tipo="${t}" style="${t === tipo ? 'background:var(--sky)' : ''}"><div class="tx">${esc(NOMBRES[t] || t)}<div class="m">${todos.filter(c => c.tipo === t && c.activo).length} opciones</div></div></li>`).join('')}</ul></div></div>
    <div class="card"><div class="hd"><h3>${esc(NOMBRES[tipo] || tipo)}</h3><div class="sp"></div><button class="btn s p" id="catNueva">＋ Opción</button></div><div class="bd sin"><table><thead><tr><th>Orden</th><th>Etiqueta (lo que se ve)</th><th>Clave</th><th>Activa</th></tr></thead><tbody>
      ${items.map(c => `<tr><td class="mono"><input type="number" value="${c.orden}" data-orden="${c.id}" style="width:60px;padding:6px;border:1px solid var(--line-2);border-radius:6px"></td><td><input value="${esc(c.etiqueta)}" data-etq="${c.id}" style="width:100%;padding:6px 8px;border:1px solid var(--line-2);border-radius:6px"></td><td class="small muted mono">${esc(c.clave)}</td><td><input type="checkbox" ${c.activo ? 'checked' : ''} data-act="${c.id}"></td></tr>`).join('')}</tbody></table></div><div class="bd"><button class="btn p" id="catGuardar">Guardar cambios</button></div></div>
  </div>`;
  vista.querySelectorAll('[data-tipo]').forEach(li => li.onclick = () => catalogos({ tipo: li.dataset.tipo }));
  document.getElementById('catGuardar').onclick = async () => { for (const c of items) { const fila = { tipo: c.tipo, clave: c.clave, etiqueta: vista.querySelector(`[data-etq="${c.id}"]`).value.trim() || c.etiqueta, orden: Number(vista.querySelector(`[data-orden="${c.id}"]`).value) || 0, activo: vista.querySelector(`[data-act="${c.id}"]`).checked }; await api.guardarCatalogo(fila); } api.limpiarCacheCatalogos(); cat = await api.catalogos(); toast('Catálogo guardado'); catalogos({ tipo }); };
  document.getElementById('catNueva').onclick = () => { modal('Nueva opción', `<div class="form"><div class="f"><label>Etiqueta</label><input id="cn_e" placeholder="Ej. Dejó más de la mitad"></div><div class="f"><label>Clave (sin espacios ni acentos; no se cambia después)</label><input id="cn_c" placeholder="Ej. mas_de_la_mitad"></div></div>`, `<button class="btn" data-cerrar>Cancelar</button><button class="btn p" id="cn_ok">Agregar</button>`); document.getElementById('cn_ok').onclick = async () => { const e = val('cn_e'), c = val('cn_c').toLowerCase().replace(/[^a-z0-9_]/g, '_'); if (!e || !c) { toast('Faltan etiqueta o clave.'); return; } await api.guardarCatalogo({ tipo, clave: c, etiqueta: e, orden: items.length + 1, activo: true }); api.limpiarCacheCatalogos(); cat = await api.catalogos(); cerrarModal(); catalogos({ tipo }); }; };
}

ir('inicio');
