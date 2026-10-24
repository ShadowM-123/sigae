/* SIGAE — avisos y recordatorios calculados al vuelo (cumpleaños 30/7/3, pagos, bitácoras, citas, evaluaciones, solicitudes).
   En producción una tarea programada además los manda por correo (Resend) y los guarda en `notificaciones`. */
import * as api from './api.js';
import { hoyIso, sumarDias, diasEntre, fecha, proximoCumple, nombreCorto, esc, relativo } from './ui.js';

const HITOS = [30, 7, 3, 0];
const cumpleAviso = (nombre, nac, quien) => { const c = proximoCumple(nac); if (!c) return null; if (!HITOS.includes(c.dias) && c.dias > 3) return null; return { tipo: 'cumple', nivel: c.dias <= 3 ? 'warn' : 'info', texto: c.dias === 0 ? `🎂 ¡Hoy cumple años ${nombre}!` : `🎂 ${nombre} (${quien}) cumple años el ${fecha(c.fecha)} · en ${c.dias} días`, fecha: c.fecha }; };

export async function avisosDireccion() {
  const hoy = hoyIso(); const out = [];
  const [pan, monis, pagos, citas, evals, sols, tareas, bsAyer] = await Promise.all([api.panoramaEstudiantes(), api.monitoras(), api.pagosTodos(), api.citasEntre(hoy, sumarDias(hoy, 1)), api.evaluacionesEntre(sumarDias(hoy, -60), sumarDias(hoy, 7)), api.solicitudesAbiertas(), api.tareas(), api.bitacorasEntre(sumarDias(hoy, -1), sumarDias(hoy, -1))]);
  pan.forEach(e => { const a = cumpleAviso(nombreCorto(e.nombre), e.fecha_nacimiento, 'estudiante'); if (a) out.push(a); });
  monis.forEach(m => { const a = cumpleAviso(nombreCorto(m.nombre), m.fecha_nacimiento, 'monitora'); if (a) out.push(a); });
  const fams = await api.familias();
  pagos.forEach(p => { const f = fams.find(x => x.id === p.familia_id); const d = diasEntre(hoy, p.fecha_vencimiento); if (p.estado === 'vencido' || (p.estado === 'pendiente' && d < 0)) out.push({ tipo: 'pago', nivel: 'bad', texto: `💳 Pago vencido de ${f?.nombre_familia || 'familia'} · ${fecha(p.fecha_vencimiento)}`, fecha: p.fecha_vencimiento }); else if (p.estado === 'pendiente' && d <= 3) out.push({ tipo: 'pago', nivel: 'warn', texto: `💳 ${f?.nombre_familia} paga ${d === 0 ? 'hoy' : 'en ' + d + ' días'} (${fecha(p.fecha_vencimiento)})`, fecha: p.fecha_vencimiento }); });
  citas.forEach(c => { const e = pan.find(x => x.id === c.estudiante_id); out.push({ tipo: 'cita', nivel: 'info', texto: `🩺 ${nombreCorto(e?.nombre || '')} tiene cita ${c.fecha === hoy ? 'hoy' : 'mañana'} con ${c.especialista_nombre || c.especialidad} ${c.hora ? 'a las ' + c.hora.slice(0, 5) : ''}`, fecha: c.fecha }); });
  evals.filter(ev => !ev.realizada && ev.fecha).forEach(ev => { const e = pan.find(x => x.id === ev.estudiante_id); const d = diasEntre(hoy, ev.fecha); out.push({ tipo: 'evaluacion', nivel: d < 0 ? 'bad' : 'warn', texto: `◔ Evaluación ${ev.tipo} de ${nombreCorto(e?.nombre || '')} ${d < 0 ? 'vencida desde el ' + fecha(ev.fecha) : d === 0 ? 'es hoy' : 'en ' + d + ' días (' + fecha(ev.fecha) + ')'}`, fecha: ev.fecha }); });
  sols.filter(s => s.estado === 'recibida').forEach(s => { const e = pan.find(x => x.id === s.estudiante_id); out.push({ tipo: 'solicitud', nivel: 'warn', texto: `📨 Solicitud nueva de ${s.tipo === 'visita_escolar' ? 'visita escolar' : 'reporte'} · ${nombreCorto(e?.nombre || '')} · ${relativo(s.creado_en.slice(0, 10))}`, fecha: s.creado_en.slice(0, 10) }); });
  tareas.filter(t => t.fecha && t.fecha < hoy).forEach(t => out.push({ tipo: 'tarea', nivel: 'bad', texto: `☑ Tarea atrasada: ${t.titulo}`, fecha: t.fecha }));
  const ayer = sumarDias(hoy, -1);
  pan.filter(e => e.asignacion && api.diasHabiles(e, ayer, ayer).length && !bsAyer.some(b => b.estudiante_id === e.id && b.estado !== 'borrador')).forEach(e => out.push({ tipo: 'bitacora', nivel: 'bad', texto: `✎ Falta la bitácora de ayer de ${nombreCorto(e.nombre)} (${nombreCorto(e.monitora?.nombre || '')})`, fecha: ayer }));
  return out.sort((a, b) => ({ bad: 0, warn: 1, info: 2 }[a.nivel] - { bad: 0, warn: 1, info: 2 }[b.nivel]));
}

export async function avisosMonitora(perfilId, estudiantes) {
  const hoy = hoyIso(); const out = [];
  for (const e of estudiantes) {
    const a = cumpleAviso(nombreCorto(e.nombre), e.fecha_nacimiento, 'tu estudiante'); if (a) out.push(a);
    const [citas, evals] = await Promise.all([api.citasDe(e.id, { desde: hoy }), api.evaluacionesDe(e.id)]);
    citas.filter(c => diasEntre(hoy, c.fecha) <= 1).forEach(c => out.push({ tipo: 'cita', nivel: 'info', texto: `🩺 ${nombreCorto(e.nombre)} tiene cita ${c.fecha === hoy ? 'hoy' : 'mañana'} con ${c.especialista_nombre || c.especialidad}${c.hora ? ' a las ' + c.hora.slice(0, 5) : ''}`, fecha: c.fecha }));
    evals.filter(ev => !ev.realizada && ev.fecha && diasEntre(hoy, ev.fecha) <= 7 && diasEntre(hoy, ev.fecha) >= 0).forEach(ev => out.push({ tipo: 'evaluacion', nivel: 'warn', texto: `◔ Evaluación ${ev.tipo} de ${nombreCorto(e.nombre)} el ${fecha(ev.fecha)}. Revisa los objetivos antes.`, fecha: ev.fecha }));
  }
  const eventos = await api.eventosEntre(hoy, sumarDias(hoy, 7));
  eventos.filter(ev => ev.monitora_id === perfilId || (ev.estudiante_id && estudiantes.some(e => e.id === ev.estudiante_id)) || ev.tipo === 'capacitacion').forEach(ev => out.push({ tipo: ev.tipo, nivel: 'info', texto: `📅 ${ev.titulo} · ${fecha(ev.fecha)}${ev.hora ? ' ' + ev.hora.slice(0, 5) : ''}`, fecha: ev.fecha }));
  return out;
}

export async function avisosFamilia(perfilId, hijo) {
  const hoy = hoyIso(); const out = []; if (!hijo) return out;
  const [pago, citas, sols] = await Promise.all([api.proximoPago(hijo.familia.id), api.citasDe(hijo.id, { desde: hoy }), api.solicitudesDe(perfilId)]);
  const a = cumpleAviso(nombreCorto(hijo.nombre), hijo.fecha_nacimiento, ''); if (a) out.push(a);
  if (pago) { const d = diasEntre(hoy, pago.fecha_vencimiento); if (pago.estado === 'vencido') out.push({ tipo: 'pago', nivel: 'bad', texto: `💳 Tienes un pago pendiente desde el ${fecha(pago.fecha_vencimiento)}`, fecha: pago.fecha_vencimiento }); else if (d <= 3) out.push({ tipo: 'pago', nivel: 'warn', texto: `💳 Tu pago es ${d === 0 ? 'hoy' : 'en ' + d + ' días'} (${fecha(pago.fecha_vencimiento)})`, fecha: pago.fecha_vencimiento }); }
  citas.filter(c => diasEntre(hoy, c.fecha) <= 1).forEach(c => out.push({ tipo: 'cita', nivel: 'info', texto: `🩺 Cita ${c.fecha === hoy ? 'hoy' : 'mañana'} con ${c.especialista_nombre || c.especialidad}${c.hora ? ' a las ' + c.hora.slice(0, 5) : ''}${c.lugar_modalidad ? ' · ' + c.lugar_modalidad : ''}`, fecha: c.fecha }));
  sols.filter(s => s.estado !== 'recibida' && diasEntre(s.actualizado_en.slice(0, 10), hoy) <= 7).forEach(s => out.push({ tipo: 'solicitud', nivel: 'info', texto: `📨 Tu solicitud de reporte cambió a «${ESTADOS_SOL[s.estado]}»${s.respuesta_direccion ? ': ' + s.respuesta_direccion : ''}`, fecha: s.actualizado_en.slice(0, 10) }));
  return out;
}

export const ESTADOS_SOL = { recibida: 'Recibida', en_revision: 'En revisión por Dirección', info_adicional: 'Se requiere información adicional', aprobada_en_proceso: 'Aprobada y en proceso', atendida: 'Atendida', no_autorizada: 'No autorizada' };
export const tagSol = e => `<span class="tag ${{ recibida: 'warn', en_revision: '', info_adicional: 'warn', aprobada_en_proceso: '', atendida: 'ok', no_autorizada: 'bad' }[e]}">${ESTADOS_SOL[e] || e}</span>`;

export function pintarAvisos(avisos, { vacio = 'Sin avisos por ahora.' } = {}) {
  if (!avisos.length) return `<div class="vacio">${vacio}</div>`;
  return `<div class="col" style="gap:6px">${avisos.map(a => `<div class="alerta ${a.nivel === 'info' ? '' : a.nivel}"><span class="tx">${esc(a.texto)}</span></div>`).join('')}</div>`;
}
