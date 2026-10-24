/* SIGAE — Dirección, paso C: calendario, pendientes y solicitudes, pagos por familia, red de apoyo del estudiante. */
import * as api from './api.js';
import { esc, fecha, fechaLarga, hora, horaCorta, hoyIso, sumarDias, diasEntre, toast, modal, cerrarModal, val, iniciales, nombreCorto, dinero, relativo, proximoCumple } from './ui.js';
import { montarCalendario, TIPOS } from './calendario.js';
import { ESTADOS_SOL, tagSol } from './avisos.js';

const TIPO_SOL = { reporte_familia: 'Solicitud de reporte (familia)', reporte_especialista: 'Solicitud de reporte (especialista)', visita_escolar: 'Solicitud de visita escolar' };
const TIPO_ESP = { terapeuta: 'Terapeuta', externo: 'Especialista externo', personal_escolar: 'Personal escolar' };

/* ---------- eventos del calendario de Dirección ---------- */
export async function eventosDireccion(desde, hasta, ctx) {
  const [pan, monis, fams, pagos, citas, evals, tareas, eventos] = await Promise.all([api.panoramaEstudiantes(), api.monitoras(), api.familias(), api.pagosTodos(), api.citasEntre(desde, hasta), api.evaluacionesEntre(desde, hasta), api.tareasTodas(), api.eventosEntre(desde, hasta)]);
  const out = [];
  const anio = +desde.slice(0, 4), anio2 = +hasta.slice(0, 4);
  const cumple = (nombre, nac, sub) => { if (!nac) return; for (const y of new Set([anio, anio2])) { const f = `${y}-${nac.slice(5)}`; if (f >= desde && f <= hasta) out.push({ id: 'c' + nombre + y, fecha: f, tipo: 'cumple', titulo: `Cumpleaños de ${nombreCorto(nombre)}`, sub }); } };
  pan.forEach(e => cumple(e.nombre, e.fecha_nacimiento, 'Estudiante · ' + (e.escuela || '')));
  monis.forEach(m => cumple(m.nombre, m.fecha_nacimiento, 'Monitora educativa'));
  pagos.filter(p => p.fecha_vencimiento >= desde && p.fecha_vencimiento <= hasta).forEach(p => { const f = fams.find(x => x.id === p.familia_id); out.push({ id: p.id, fecha: p.fecha_vencimiento, tipo: 'pago', titulo: `Pago · ${f?.nombre_familia || ''}`, sub: `${dinero(p.monto)} · ${{ pendiente: 'pendiente', pagado: 'pagado', vencido: 'vencido' }[p.estado]}`, accion: () => ctx.verFamilia(p.familia_id) }); });
  citas.forEach(c => { const e = pan.find(x => x.id === c.estudiante_id); out.push({ id: c.id, fecha: c.fecha, hora: c.hora, tipo: 'cita', titulo: `${nombreCorto(e?.nombre || '')} · ${c.especialista_nombre || c.especialidad}`, sub: `${c.especialidad || ''}${c.lugar_modalidad ? ' · ' + c.lugar_modalidad : ''}`, accion: () => ctx.verEstudiante(c.estudiante_id) }); });
  evals.filter(ev => ev.fecha).forEach(ev => { const e = pan.find(x => x.id === ev.estudiante_id); out.push({ id: ev.id, fecha: ev.fecha, tipo: 'evaluacion', titulo: `Evaluación ${ev.tipo} · ${nombreCorto(e?.nombre || '')}`, sub: ev.realizada ? 'Realizada' : 'Programada', accion: () => ctx.verEstudiante(ev.estudiante_id) }); });
  tareas.filter(t => t.fecha && t.fecha >= desde && t.fecha <= hasta).forEach(t => out.push({ id: t.id, fecha: t.fecha, tipo: 'tarea', titulo: t.titulo, sub: t.estado === 'hecha' ? 'Hecha' : 'Pendiente' }));
  eventos.forEach(ev => { const e = pan.find(x => x.id === ev.estudiante_id); out.push({ id: ev.id, fecha: ev.fecha, hora: ev.hora, tipo: TIPOS[ev.tipo] ? ev.tipo : 'general', titulo: ev.titulo, sub: [e ? nombreCorto(e.nombre) : '', ev.lugar || ''].filter(Boolean).join(' · '), accion: () => editarEvento(ev, ctx) }); });
  return out;
}

export async function calendario(vista, ctx) {
  vista.innerHTML = `<div class="row"><h1 class="titulo">Calendario</h1><div class="sp"></div><button class="btn p" id="btnEvento">＋ Evento</button></div><div class="subtitulo">Cumpleaños, pagos, citas con especialistas, evaluaciones, tareas, visitas y reuniones, todo en un solo lugar. Toca un día para ver el detalle.</div><div id="calRoot"></div>`;
  const cal = montarCalendario(document.getElementById('calRoot'), { cargar: (a, b) => eventosDireccion(a, b, ctx) });
  ctx.recargarCalendario = () => cal.recargar();
  document.getElementById('btnEvento').onclick = () => editarEvento({ fecha: cal.dia }, ctx);
}

export async function editarEvento(ev, ctx) {
  const [pan, monis] = await Promise.all([api.panoramaEstudiantes(), api.monitoras()]);
  modal(ev.id ? 'Editar evento' : 'Nuevo evento', `<div class="form g2">
    <div class="f full"><label>Título</label><input id="ev_t" value="${esc(ev.titulo || '')}" placeholder="Ej. Visita escolar · Colegio X"></div>
    <div class="f"><label>Tipo</label><select id="ev_tipo">${['visita_escolar', 'reunion', 'entrevista', 'capacitacion', 'general'].map(t => `<option value="${t}" ${ev.tipo === t ? 'selected' : ''}>${TIPOS[t].tx}</option>`).join('')}</select></div>
    <div class="f"><label>Fecha</label><input type="date" id="ev_f" value="${ev.fecha || hoyIso()}"></div>
    <div class="f"><label>Hora</label><input type="time" id="ev_h" value="${horaCorta(ev.hora) || ''}"></div><div class="f"><label>Lugar</label><input id="ev_l" value="${esc(ev.lugar || '')}"></div>
    <div class="f"><label>Estudiante (opcional)</label><select id="ev_e"><option value="">—</option>${pan.map(e => `<option value="${e.id}" ${ev.estudiante_id === e.id ? 'selected' : ''}>${esc(e.nombre)}</option>`).join('')}</select></div>
    <div class="f"><label>Monitora (opcional)</label><select id="ev_m"><option value="">—</option>${monis.map(m => `<option value="${m.id}" ${ev.monitora_id === m.id ? 'selected' : ''}>${esc(m.nombre)}</option>`).join('')}</select></div>
    <div class="f full"><label>Notas</label><textarea id="ev_n">${esc(ev.notas || '')}</textarea></div></div>`,
    `${ev.id ? '<button class="btn peligro" id="ev_borrar">Eliminar</button>' : ''}<button class="btn" data-cerrar>Cancelar</button><button class="btn p" id="ev_ok">Guardar</button>`);
  document.getElementById('ev_ok').onclick = async () => { if (!val('ev_t')) { toast('Falta el título.'); return; } await api.guardarEvento({ ...(ev.id ? { id: ev.id } : { creado_por: ctx.perfil.id }), titulo: val('ev_t'), tipo: val('ev_tipo'), fecha: val('ev_f'), hora: val('ev_h') || null, lugar: val('ev_l') || null, estudiante_id: val('ev_e') || null, monitora_id: val('ev_m') || null, notas: val('ev_n') || null }); cerrarModal(); toast('Evento guardado'); ctx.recargarCalendario?.(); };
  document.getElementById('ev_borrar')?.addEventListener('click', async () => { if (!confirm('¿Eliminar este evento?')) return; await api.borrarEvento(ev.id); cerrarModal(); ctx.recargarCalendario?.(); });
}

/* ---------- Pendientes: tareas y solicitudes ---------- */
export async function pendientes(vista, ctx) {
  const [tareas, sols, pan] = await Promise.all([api.tareasTodas(), api.solicitudesTodas(), api.panoramaEstudiantes()]);
  const hoy = hoyIso(); const verHechas = ctx._verHechas || false;
  const abiertas = sols.filter(s => !['atendida', 'no_autorizada'].includes(s.estado)), cerradas = sols.filter(s => ['atendida', 'no_autorizada'].includes(s.estado));
  const tareasVis = tareas.filter(t => verHechas || t.estado === 'pendiente').sort((a, b) => (a.estado > b.estado ? 1 : a.estado < b.estado ? -1 : (a.fecha || '9').localeCompare(b.fecha || '9')));
  const filaSol = s => { const e = pan.find(x => x.id === s.estudiante_id); return `<li class="click" data-sol="${s.id}"><div class="tx"><b>${TIPO_SOL[s.tipo]}</b><div class="m">${esc(nombreCorto(e?.nombre || ''))} · ${esc(s.datos?.motivo || '')} · ${relativo(s.creado_en.slice(0, 10))}${s.datos?.fecha_cita ? ` · cita el ${fecha(s.datos.fecha_cita)}` : ''}</div></div>${tagSol(s.estado)}</li>`; };
  vista.innerHTML = `<h1 class="titulo">Pendientes</h1><div class="subtitulo">Solicitudes de familias y especialistas, y tus tareas. Las solicitudes nunca generan un documento por sí solas: tú decides, preparas y autorizas.</div>
  <div class="grid g2">
    <div class="card"><div class="hd"><h3>Solicitudes abiertas</h3><div class="sp"></div><span class="tag">${abiertas.length}</span></div><div class="bd sin"><ul class="lista">${abiertas.map(filaSol).join('') || '<li class="vacio">No hay solicitudes abiertas.</li>'}</ul></div>
      ${cerradas.length ? `<div class="hd" style="border-top:1px solid var(--line)"><h3 class="muted">Atendidas y cerradas</h3></div><div class="bd sin"><ul class="lista">${cerradas.slice(0, 10).map(filaSol).join('')}</ul></div>` : ''}</div>
    <div class="card"><div class="hd"><h3>Tareas</h3><div class="sp"></div><label class="small muted" style="display:flex;gap:4px;align-items:center"><input type="checkbox" id="chkHechas" ${verHechas ? 'checked' : ''}> ver hechas</label><button class="btn s" id="btnTarea2">＋ Tarea</button></div><div class="bd sin"><ul class="lista">${tareasVis.map(t => { const e = pan.find(x => x.id === t.estudiante_id); return `<li><input type="checkbox" data-tarea="${t.id}" ${t.estado === 'hecha' ? 'checked' : ''}><div class="tx" style="${t.estado === 'hecha' ? 'opacity:.55;text-decoration:line-through' : ''}"><b>${esc(t.titulo)}</b><div class="m">${t.fecha ? fecha(t.fecha) + ' · ' + relativo(t.fecha) : 'sin fecha'}${e ? ' · ' + esc(nombreCorto(e.nombre)) : ''}</div></div>${t.estado === 'pendiente' && t.fecha && t.fecha < hoy ? '<span class="tag bad">Atrasada</span>' : t.fecha === hoy && t.estado === 'pendiente' ? '<span class="tag warn">Hoy</span>' : ''}</li>`; }).join('') || '<li class="vacio">Sin tareas.</li>'}</ul></div></div>
  </div>`;
  vista.querySelectorAll('[data-sol]').forEach(li => li.onclick = () => verSolicitud(li.dataset.sol, ctx, () => pendientes(vista, ctx)));
  vista.querySelectorAll('[data-tarea]').forEach(c => c.onchange = async () => { await api.guardarTarea({ id: c.dataset.tarea, estado: c.checked ? 'hecha' : 'pendiente' }); pendientes(vista, ctx); });
  document.getElementById('chkHechas').onchange = e => { ctx._verHechas = e.target.checked; pendientes(vista, ctx); };
  document.getElementById('btnTarea2').onclick = () => ctx.nuevaTarea(() => pendientes(vista, ctx));
}

export async function verSolicitud(id, ctx, alCambiar) {
  const s = await api.solicitud(id); const [e, hist, sol] = await Promise.all([api.estudiante(s.estudiante_id), api.historialSolicitud(id), api.perfil(s.solicitante_id)]);
  const d = s.datos || {};
  const campos = Object.entries({ motivo: 'Motivo', objetivo: 'Objetivo', especialista: 'Especialista', fecha_cita: 'Fecha de la cita', periodo: 'Periodo a revisar', fecha_limite: 'Fecha límite', detalle: 'Detalle', informacion: 'Información que necesita', personas: 'Personas que deben participar', fechas_propuestas: 'Fechas propuestas', comentarios: 'Comentarios' }).filter(([k]) => d[k]);
  modal(TIPO_SOL[s.tipo], `
    <div class="row" style="margin-bottom:10px">${tagSol(s.estado)}<span class="small muted">Recibida ${fecha(s.creado_en)} ${hora(s.creado_en)} · de ${esc(sol?.nombre || '')}</span></div>
    <dl class="dl" style="margin-bottom:12px"><dt>Estudiante</dt><dd><b>${esc(e?.nombre || '')}</b></dd>${campos.map(([k, l]) => `<dt>${l}</dt><dd>${k.startsWith('fecha') ? fecha(d[k]) : esc(d[k])}</dd>`).join('')}</dl>
    ${s.respuesta_direccion ? `<div class="alerta" style="margin-bottom:12px"><span class="tx"><b>Última respuesta de Dirección:</b> ${esc(s.respuesta_direccion)}</span></div>` : ''}
    <div class="card"><div class="hd"><h3>Actualizar estado</h3></div><div class="bd form"><div class="f"><label>Nuevo estado</label><select id="so_estado">${Object.entries(ESTADOS_SOL).map(([k, v]) => `<option value="${k}" ${k === s.estado ? 'selected' : ''}>${v}</option>`).join('')}</select></div><div class="f"><label>Mensaje para quien solicitó (lo verá en su portal)</label><textarea id="so_nota" placeholder="Ej. Lo tendré listo el jueves; pasa por él a la oficina o te lo mando por correo."></textarea></div><div class="small muted">Al marcar «Atendida» puedes adjuntar el reporte en el paso D (descargas). Por ahora queda el registro y el mensaje.</div></div></div>
    <h4 style="margin:14px 0 6px">Historial</h4><ul class="lista">${hist.map(h => `<li style="padding:6px 0"><div class="tx"><b>${ESTADOS_SOL[h.estado]}</b><div class="m">${fecha(h.fecha)} ${hora(h.fecha)}${h.nota ? ' · ' + esc(h.nota) : ''}</div></div></li>`).join('')}</ul>`,
    `<button class="btn" data-cerrar>Cerrar</button><button class="btn p" id="so_ok">Guardar estado</button>`);
  document.getElementById('so_ok').onclick = async () => { await api.cambiarEstadoSolicitud(id, val('so_estado'), val('so_nota'), ctx.perfil.id); cerrarModal(); toast('Estado actualizado; la familia lo verá en su portal'); alCambiar?.(); };
}

/* ---------- Familia: tutores, estudiantes, configuración de pagos ---------- */
export async function verFamilia(id, ctx, alCambiar) {
  const [f, tut, pan] = await Promise.all([api.familia(id), api.tutoresDe(id), api.panoramaEstudiantes()]);
  const pagos = await api.pagosDe(id); const hoy = hoyIso(); const es = pan.filter(e => e.familia_id === id);
  const estadoTag = p => p.estado === 'pagado' ? `<span class="tag ok">Pagado ${p.pagado_en ? fecha(p.pagado_en) : ''}</span>` : (p.estado === 'vencido' || p.fecha_vencimiento < hoy) ? '<span class="tag bad">Vencido</span>' : `<span class="tag warn">Pendiente · en ${diasEntre(hoy, p.fecha_vencimiento)} d</span>`;
  modal(esc(f.nombre_familia), `
    <div class="grid g2">
      <div class="card"><div class="hd"><h3>Tutores y estudiantes</h3></div><div class="bd small">${tut.map(t => `<div><b>${esc(t.nombre)}</b> · ${esc(t.parentesco || '')} · ${esc(t.telefono || '')} · ${esc(t.correo || '')}</div>`).join('')}<div style="margin-top:8px">${es.map(e => `<span class="tag">${esc(nombreCorto(e.nombre))}</span> `).join('')}</div>${f.notas ? `<p class="muted" style="margin-top:8px">${esc(f.notas)}</p>` : ''}</div></div>
      <div class="card"><div class="hd"><h3>Configuración de pago</h3></div><div class="bd form g2"><div class="f"><label>Día de pago (1–28)</label><input type="number" min="1" max="28" id="fa_dia" value="${f.dia_de_pago ?? ''}"></div><div class="f"><label>Monto mensual</label><input type="number" step="0.01" id="fa_monto" value="${f.monto_mensual ?? ''}"></div><div class="f full"><label>Notas</label><input id="fa_notas" value="${esc(f.notas || '')}"></div><div class="f full row"><button class="btn p s" id="fa_guardar">Guardar configuración</button><button class="btn s" id="fa_generar">Generar pagos de los próximos 3 meses</button></div></div></div>
    </div>
    <div class="card" style="margin-top:12px"><div class="hd"><h3>Pagos</h3><div class="sp"></div><button class="btn s" id="fa_nuevo">＋ Pago manual</button></div><div class="bd sin"><table><thead><tr><th>Vence</th><th>Monto</th><th>Estado</th><th>Nota</th><th></th></tr></thead><tbody>${pagos.map(p => `<tr><td class="mono">${fecha(p.fecha_vencimiento)}</td><td class="mono">${dinero(p.monto)}</td><td>${estadoTag(p)}</td><td class="small muted">${esc(p.nota || '')}</td><td class="row" style="gap:4px;justify-content:flex-end">${p.estado !== 'pagado' ? `<button class="btn s p" data-pagar="${p.id}">Registrar pago</button>` : `<button class="btn s" data-despagar="${p.id}">Quitar pago</button>`}<button class="btn s" data-editar="${p.id}">Editar</button></td></tr>`).join('') || '<tr><td colspan="5" class="vacio">Sin pagos registrados. Configura el día y genera los próximos.</td></tr>'}</tbody></table></div></div>
    <div class="small muted" style="margin-top:8px">La familia ve en su portal el próximo pago con los días que faltan y si hay alguno vencido. Los recordatorios se envían 3 días antes y el mismo día.</div>`);
  const refrescar = () => { verFamilia(id, ctx, alCambiar); alCambiar?.(); };
  document.getElementById('fa_guardar').onclick = async () => { await api.guardarFamilia({ id, dia_de_pago: val('fa_dia') ? Number(val('fa_dia')) : null, monto_mensual: val('fa_monto') ? Number(val('fa_monto')) : null, notas: val('fa_notas') || null }); toast('Configuración guardada'); refrescar(); };
  document.getElementById('fa_generar').onclick = async () => { const fam = await api.familia(id); if (!fam.dia_de_pago) { toast('Primero guarda el día de pago.'); return; } const n = await api.generarPagos(fam, 3); toast(n.length ? `${n.length} pago(s) generados` : 'Los próximos 3 meses ya estaban generados'); refrescar(); };
  document.querySelectorAll('[data-pagar]').forEach(b => b.onclick = () => editarPago(pagos.find(p => p.id === b.dataset.pagar), { pagar: true }, refrescar));
  document.querySelectorAll('[data-despagar]').forEach(b => b.onclick = async () => { await api.guardarPago({ id: b.dataset.despagar, estado: 'pendiente', pagado_en: null }); refrescar(); });
  document.querySelectorAll('[data-editar]').forEach(b => b.onclick = () => editarPago(pagos.find(p => p.id === b.dataset.editar), {}, refrescar));
  document.getElementById('fa_nuevo').onclick = () => editarPago({ familia_id: id, fecha_vencimiento: hoy, monto: f.monto_mensual, estado: 'pendiente' }, {}, refrescar);
}
function editarPago(p, { pagar = false } = {}, alCambiar) {
  modal(pagar ? 'Registrar pago' : p.id ? 'Editar pago' : 'Nuevo pago', `<div class="form g2"><div class="f"><label>Fecha de vencimiento</label><input type="date" id="pg_f" value="${p.fecha_vencimiento}"></div><div class="f"><label>Monto</label><input type="number" step="0.01" id="pg_m" value="${p.monto ?? ''}"></div>
    <div class="f"><label>Estado</label><select id="pg_e"><option value="pendiente" ${!pagar && p.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option><option value="pagado" ${pagar || p.estado === 'pagado' ? 'selected' : ''}>Pagado</option><option value="vencido" ${!pagar && p.estado === 'vencido' ? 'selected' : ''}>Vencido</option></select></div><div class="f"><label>Fecha en que se pagó</label><input type="date" id="pg_p" value="${p.pagado_en || (pagar ? hoyIso() : '')}"></div>
    <div class="f full"><label>Nota</label><input id="pg_n" value="${esc(p.nota || '')}" placeholder="Ej. transferencia, efectivo, referencia…"></div></div>`,
    `${p.id ? '<button class="btn peligro" id="pg_borrar">Eliminar</button>' : ''}<button class="btn" data-cerrar>Cancelar</button><button class="btn p" id="pg_ok">Guardar</button>`);
  document.getElementById('pg_ok').onclick = async () => { const estado = val('pg_e'); await api.guardarPago({ ...(p.id ? { id: p.id } : { familia_id: p.familia_id }), fecha_vencimiento: val('pg_f'), monto: val('pg_m') ? Number(val('pg_m')) : null, estado, pagado_en: estado === 'pagado' ? (val('pg_p') || hoyIso()) : null, nota: val('pg_n') || null }); cerrarModal(); toast(estado === 'pagado' ? 'Pago registrado' : 'Pago guardado'); alCambiar?.(); };
  document.getElementById('pg_borrar')?.addEventListener('click', async () => { if (!confirm('¿Eliminar este pago?')) return; await api.borrarPago(p.id); cerrarModal(); alCambiar?.(); });
}

/* ---------- Red de apoyo del estudiante (especialistas y citas), reutilizable por familia ---------- */
export async function htmlRedApoyo(estId, { editable = true, prefijo = 'ra' } = {}) {
  const [esp, citas] = await Promise.all([api.especialistasDe(estId), api.citasDe(estId, { desde: sumarDias(hoyIso(), -1) })]);
  return `<div class="grid g2">
    <div class="card"><div class="hd"><h3>Terapeutas, especialistas y escuela</h3><div class="sp"></div>${editable ? `<button class="btn s" data-${prefijo}-nuevo-esp>＋ Agregar</button>` : ''}</div><div class="bd sin"><ul class="lista">${esp.map(x => `<li ${editable ? `class="click" data-${prefijo}-esp="${x.id}"` : ''}><span class="ava">${iniciales(x.nombre)}</span><div class="tx"><b>${esc(x.nombre)}</b><div class="m">${esc(x.especialidad || '')} · ${TIPO_ESP[x.tipo]}${x.dias_horarios ? ' · ' + esc(x.dias_horarios) : ''}${x.lugar ? '<br>' + esc(x.lugar) : ''}${x.contacto ? ' · ' + esc(x.contacto) : ''}</div></div>${x.perfil_id ? '<span class="tag ok" title="Tiene usuario en SIGAE">Con acceso</span>' : ''}</li>`).join('') || '<li class="vacio">Aún no hay especialistas registrados.</li>'}</ul></div></div>
    <div class="card"><div class="hd"><h3>Próximas citas</h3><div class="sp"></div>${editable ? `<button class="btn s" data-${prefijo}-nueva-cita>＋ Cita</button>` : ''}</div><div class="bd sin"><ul class="lista">${citas.map(c => `<li ${editable ? `class="click" data-${prefijo}-cita="${c.id}"` : ''}><div class="ava" style="font-size:11px;line-height:1.1;text-align:center">${fecha(c.fecha).split(' ').slice(0, 2).join('<br>')}</div><div class="tx"><b>${esc(c.especialista_nombre || c.especialidad || 'Cita')}</b><div class="m">${c.hora ? horaCorta(c.hora) + ' · ' : ''}${esc(c.especialidad || '')}${c.lugar_modalidad ? ' · ' + esc(c.lugar_modalidad) : ''}${c.observaciones ? '<br>' + esc(c.observaciones) : ''}</div></div><span class="small muted">${relativo(c.fecha)}</span></li>`).join('') || '<li class="vacio">Sin citas próximas.</li>'}</ul></div></div>
  </div>`;
}
export function engancharRedApoyo(root, estId, perfilId, alCambiar, { prefijo = 'ra' } = {}) {
  root.querySelector(`[data-${prefijo}-nuevo-esp]`)?.addEventListener('click', () => editarEspecialista({ estudiante_id: estId }, perfilId, alCambiar));
  root.querySelectorAll(`[data-${prefijo}-esp]`).forEach(li => li.onclick = async () => { const all = await api.especialistasDe(estId); editarEspecialista(all.find(x => x.id === li.getAttribute(`data-${prefijo}-esp`)), perfilId, alCambiar); });
  root.querySelector(`[data-${prefijo}-nueva-cita]`)?.addEventListener('click', () => editarCita({ estudiante_id: estId, fecha: hoyIso() }, perfilId, alCambiar));
  root.querySelectorAll(`[data-${prefijo}-cita]`).forEach(li => li.onclick = async () => { const all = await api.citasDe(estId); editarCita(all.find(x => x.id === li.getAttribute(`data-${prefijo}-cita`)), perfilId, alCambiar); });
}
export function editarEspecialista(x, perfilId, alCambiar) {
  modal(x.id ? 'Editar especialista' : 'Agregar especialista', `<div class="form g2"><div class="f full"><label>Nombre</label><input id="es_n" value="${esc(x.nombre || '')}" placeholder="Ej. Lic. Karina Soto"></div><div class="f"><label>Especialidad o tipo de atención</label><input id="es_e" value="${esc(x.especialidad || '')}" placeholder="Terapia de lenguaje"></div><div class="f"><label>Tipo</label><select id="es_t">${Object.entries(TIPO_ESP).map(([k, v]) => `<option value="${k}" ${x.tipo === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div><div class="f"><label>Contacto</label><input id="es_c" value="${esc(x.contacto || '')}"></div><div class="f"><label>Lugar</label><input id="es_l" value="${esc(x.lugar || '')}"></div><div class="f full"><label>Días y horarios de atención</label><input id="es_h" value="${esc(x.dias_horarios || '')}" placeholder="Martes y jueves 16:00"></div></div>`,
    `${x.id ? '<button class="btn peligro" id="es_quitar">Quitar</button>' : ''}<button class="btn" data-cerrar>Cancelar</button><button class="btn p" id="es_ok">Guardar</button>`);
  document.getElementById('es_ok').onclick = async () => { if (!val('es_n')) { toast('Falta el nombre.'); return; } await api.guardarEspecialista({ ...(x.id ? { id: x.id } : { estudiante_id: x.estudiante_id, registrado_por: perfilId, activo: true }), nombre: val('es_n'), especialidad: val('es_e'), tipo: val('es_t'), contacto: val('es_c'), lugar: val('es_l'), dias_horarios: val('es_h') }); cerrarModal(); toast('Guardado'); alCambiar?.(); };
  document.getElementById('es_quitar')?.addEventListener('click', async () => { if (!confirm('¿Quitar a esta persona de la red de apoyo? Se conserva el historial.')) return; await api.guardarEspecialista({ id: x.id, activo: false }); cerrarModal(); alCambiar?.(); });
}
export async function editarCita(c, perfilId, alCambiar) {
  const esp = await api.especialistasDe(c.estudiante_id);
  modal(c.id ? 'Editar cita' : 'Nueva cita', `<div class="form g2"><div class="f full"><label>Especialista</label><select id="ci_esp"><option value="">Otro (escribir abajo)</option>${esp.map(x => `<option value="${x.id}" ${c.especialista_id === x.id ? 'selected' : ''}>${esc(x.nombre)} · ${esc(x.especialidad || '')}</option>`).join('')}</select></div><div class="f"><label>Nombre (si es otro)</label><input id="ci_n" value="${esc(c.especialista_id ? '' : (c.especialista_nombre || ''))}"></div><div class="f"><label>Especialidad</label><input id="ci_e" value="${esc(c.especialidad || '')}"></div><div class="f"><label>Fecha</label><input type="date" id="ci_f" value="${c.fecha || hoyIso()}"></div><div class="f"><label>Hora</label><input type="time" id="ci_h" value="${horaCorta(c.hora) || ''}"></div><div class="f full"><label>Lugar o modalidad</label><input id="ci_l" value="${esc(c.lugar_modalidad || '')}" placeholder="Consultorio, videollamada…"></div><div class="f full"><label>Observaciones</label><textarea id="ci_o">${esc(c.observaciones || '')}</textarea></div></div>`,
    `${c.id ? '<button class="btn peligro" id="ci_borrar">Eliminar</button>' : ''}<button class="btn" data-cerrar>Cancelar</button><button class="btn p" id="ci_ok">Guardar</button>`);
  const sel = document.getElementById('ci_esp'); sel.onchange = () => { const x = esp.find(e => e.id === sel.value); if (x) { document.getElementById('ci_e').value = x.especialidad || ''; document.getElementById('ci_l').value = x.lugar || ''; } };
  document.getElementById('ci_ok').onclick = async () => { const x = esp.find(e => e.id === val('ci_esp')); if (!x && !val('ci_n')) { toast('Elige un especialista o escribe el nombre.'); return; } await api.guardarCita({ ...(c.id ? { id: c.id } : { estudiante_id: c.estudiante_id, creada_por: perfilId }), especialista_id: x?.id || null, especialista_nombre: x ? x.nombre : val('ci_n'), especialidad: val('ci_e') || x?.especialidad || null, fecha: val('ci_f'), hora: val('ci_h') || null, lugar_modalidad: val('ci_l') || null, observaciones: val('ci_o') || null }); cerrarModal(); toast('Cita guardada'); alCambiar?.(); };
  document.getElementById('ci_borrar')?.addEventListener('click', async () => { if (!confirm('¿Eliminar la cita?')) return; await api.borrarCita(c.id); cerrarModal(); alCambiar?.(); });
}
