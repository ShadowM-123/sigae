/* SIGAE — portal de terapeutas, especialistas externos y personal escolar (paso G).
   Solo consulta: identifica el caso, ve la monitora y, si Dirección lo autorizó, lee las bitácoras. Pide visitas y reportes.
   Nunca descarga, nunca edita, nunca ve la sección confidencial ni el expediente completo. */
import * as api from './api.js';
import { exigir } from './auth.js';
import { marco, esc, fecha, fechaLarga, hora, horaCorta, hoyIso, sumarDias, toast, modal, cerrarModal, val, iniciales, nombreCorto, edadTexto, estadoBitacora, relativo } from './ui.js';
import { renderLectura } from './bitacora.js';
import { ESTADOS_SOL, tagSol } from './avisos.js';

const perfil = await exigir(['especialista']);
const cat = await api.catalogos();
const vista = document.getElementById('vista');
const hoy = hoyIso();
const SUBTIPO = { terapeuta: 'Terapeuta', externo: 'Especialista externo', personal_escolar: 'Personal escolar' };
const TIPO_SOL = { reporte_especialista: 'Solicitud de reporte', visita_escolar: 'Solicitud de visita escolar' };
const saludo = perfil.nombre.split(' ').filter(w => !/\.$/.test(w))[0] || perfil.nombre;

let vinculos = await api.vinculosDeEspecialista(perfil.id);   // filas de especialistas_estudiante con el estudiante dentro
let estSel = vinculos[0] || null;

const TABS = [{ id: 'inicio', ic: '⌂', tx: 'Inicio' }, { id: 'estudiante', ic: '☺', tx: 'Estudiante' }, { id: 'solicitudes', ic: '✉', tx: 'Mis solicitudes' }];
const { pintar: pintarTabs } = marco({ perfil, tabs: TABS, activa: 'inicio', onTab: ir, subtitulo: SUBTIPO[perfil.subtipo_especialista] || 'Especialista' });
async function ir(tab) { pintarTabs(tab); vista.innerHTML = '<div class="vacio">Cargando…</div>'; window.scrollTo(0, 0); await ({ inicio, estudiante, solicitudes }[tab] || inicio)(); }

const selector = () => vinculos.length > 1 ? `<div class="f" style="margin-bottom:12px"><label>Estudiante</label><select id="selEst">${vinculos.map(v => `<option value="${v.id}" ${estSel?.id === v.id ? 'selected' : ''}>${esc(v.estudiante.nombre)}</option>`).join('')}</select></div>` : '';
const engancharSelector = (fn) => vista.querySelector('#selEst')?.addEventListener('change', e => { estSel = vinculos.find(v => v.id === e.target.value); fn(); });

/* ---------- Inicio ---------- */
async function inicio() {
  if (!vinculos.length) { vista.innerHTML = `<h1 class="titulo">Hola, ${esc(saludo)}</h1><div class="alerta warn"><span class="tx">Tu cuenta aún no está vinculada a ningún estudiante. SHADOW te dará acceso cuando la familia o Dirección te registren en la red de apoyo.</span></div>`; return; }
  const sols = await api.solicitudesDe(perfil.id);
  const tarjetas = [];
  for (const v of vinculos) {
    const e = v.estudiante; const asig = await api.asignacionActiva(e.id); const moni = asig ? await api.perfil(asig.monitora_id) : null;
    const ultima = v.puede_ver_bitacoras ? (await api.bitacorasDe(e.id, { limite: 1 })).filter(b => b.estado !== 'borrador')[0] : null;
    tarjetas.push(`<div class="card"><div class="bd"><div class="row" style="gap:12px"><span class="ava g">${iniciales(e.nombre)}</span><div style="flex:1"><h2 style="font-family:var(--serif);font-size:20px;font-weight:700">${esc(e.nombre)}</h2><div class="small muted">${esc(e.escuela || '')}${e.grado ? ' · ' + esc(e.grado) : ''} · Monitora: <b>${esc(moni?.nombre || 'por asignar')}</b></div><div class="small muted">Tu papel: ${esc(v.especialidad || SUBTIPO[v.tipo] || '')} · ${v.puede_ver_bitacoras ? `bitácoras autorizadas${ultima ? ` · última: ${fecha(ultima.fecha_jornada)}` : ''}` : 'sin acceso a bitácoras (puedes solicitar un reporte)'}</div></div></div>
      <div class="row" style="gap:6px;margin-top:12px"><button class="btn s p" data-ver="${v.id}">Ver estudiante</button><button class="btn s" data-visita="${v.id}">Solicitar visita escolar</button><button class="btn s" data-reporte="${v.id}">Solicitar reporte</button></div></div></div>`);
  }
  const abiertas = sols.filter(s => !['atendida', 'no_autorizada'].includes(s.estado));
  vista.innerHTML = `<h1 class="titulo">Hola, ${esc(saludo)}</h1><div class="subtitulo">${SUBTIPO[perfil.subtipo_especialista] || 'Especialista'} · acceso de consulta autorizado por SHADOW.</div>
    <div class="col" style="gap:12px">${tarjetas.join('')}</div>
    <div class="card" style="margin-top:12px"><div class="hd"><h3>Mis solicitudes</h3><div class="sp"></div><button class="btn s ghost" id="verSols">Ver todas</button></div><div class="bd sin"><ul class="lista">${abiertas.slice(0, 5).map(s => `<li class="click" data-sol="${s.id}"><div class="tx"><b>${TIPO_SOL[s.tipo] || s.tipo}</b><div class="m">${esc(nombreCorto(vinculos.find(v => v.estudiante.id === s.estudiante_id)?.estudiante.nombre || ''))} · ${esc(s.datos?.motivo || '')} · ${relativo(s.creado_en.slice(0, 10))}</div></div>${tagSol(s.estado)}</li>`).join('') || '<li class="vacio">No tienes solicitudes abiertas.</li>'}</ul></div></div>
    <div class="small muted" style="margin-top:12px">Este acceso es de solo consulta. La información es confidencial y pertenece a la familia y a SHADOW; no la compartas fuera del equipo que atiende al estudiante.</div>`;
  vista.querySelectorAll('[data-ver]').forEach(b => b.onclick = () => { estSel = vinculos.find(v => v.id === b.dataset.ver); ir('estudiante'); });
  vista.querySelectorAll('[data-visita]').forEach(b => b.onclick = () => formVisita(vinculos.find(v => v.id === b.dataset.visita), inicio));
  vista.querySelectorAll('[data-reporte]').forEach(b => b.onclick = () => formReporte(vinculos.find(v => v.id === b.dataset.reporte), inicio));
  vista.querySelectorAll('[data-sol]').forEach(li => li.onclick = () => verSolicitud(sols.find(s => s.id === li.dataset.sol)));
  document.getElementById('verSols').onclick = () => ir('solicitudes');
}

/* ---------- Estudiante (perfil básico + bitácoras autorizadas) ---------- */
async function estudiante() {
  if (!estSel) return inicio();
  const v = estSel; const e = v.estudiante;
  const asig = await api.asignacionActiva(e.id); const moni = asig ? await api.perfil(asig.monitora_id) : null;
  const bs = v.puede_ver_bitacoras ? (await api.bitacorasDe(e.id, { desde: sumarDias(hoy, -60) })).filter(b => b.estado !== 'borrador') : [];
  vista.innerHTML = `<h1 class="titulo">${esc(e.nombre)}</h1>${selector()}
  <div class="grid g2">
    <div class="card"><div class="hd"><h3>Datos del caso</h3></div><div class="bd small"><p><b>Edad:</b> ${edadTexto(e.fecha_nacimiento) || '—'}</p><p><b>Escuela:</b> ${esc(e.escuela || '—')}${e.grado ? ` · ${esc(e.grado)}` : ''}${e.grupo ? ` · grupo ${esc(e.grupo)}` : ''}</p><p><b>Horario escolar:</b> ${horaCorta(e.hora_entrada)}–${horaCorta(e.hora_salida)}</p><p><b>Necesidades de apoyo:</b> ${(e.necesidades_apoyo || []).map(n => `<span class="tag gray">${esc(n)}</span>`).join(' ') || '—'}</p><p class="muted">Solo se muestra lo necesario para identificar el caso. El expediente completo lo resguarda SHADOW.</p></div></div>
    <div class="card"><div class="hd"><h3>Monitora educativa</h3></div><div class="bd">${moni ? `<div class="row" style="gap:12px"><span class="ava g">${iniciales(moni.nombre)}</span><div><b>${esc(moni.nombre)}</b><div class="small muted">Acompaña a ${esc(nombreCorto(e.nombre))} desde el ${fecha(asig.fecha_inicio)}</div></div></div>` : '<p class="muted">Aún sin monitora asignada.</p>'}<div class="row" style="gap:6px;margin-top:12px"><button class="btn s" id="btnVisita">Solicitar visita escolar</button><button class="btn s" id="btnReporte">Solicitar reporte</button></div></div></div>
  </div>
  <div class="card" style="margin-top:12px"><div class="hd"><h3>Bitácoras diarias</h3><div class="sp"></div><span class="small muted">${v.puede_ver_bitacoras ? 'Últimos 60 días · solo lectura' : 'Sin acceso'}</span></div><div class="bd sin"><ul class="lista">${v.puede_ver_bitacoras ? (bs.map(b => `<li class="click" data-bit="${b.id}"><div class="ava" title="Valoración del día">${b.valoracion_dia || '·'}</div><div class="tx"><b>${fechaLarga(b.fecha_jornada)}</b><div class="m">${esc((b.resumen_narrativo || '').slice(0, 90))}${(b.resumen_narrativo || '').length > 90 ? '…' : ''}</div></div><span class="muted small">${hora(b.enviada_en)}</span></li>`).join('') || '<li class="vacio">No hay bitácoras en los últimos 60 días.</li>') : '<li class="vacio">Dirección de SHADOW no ha habilitado la consulta de bitácoras para tu perfil. Puedes solicitar un reporte del acompañamiento.</li>'}</ul></div></div>`;
  engancharSelector(estudiante);
  document.getElementById('btnVisita').onclick = () => formVisita(v, estudiante); document.getElementById('btnReporte').onclick = () => formReporte(v, estudiante);
  vista.querySelectorAll('[data-bit]').forEach(li => li.onclick = async () => { const b = bs.find(x => x.id === li.dataset.bit); const m = modal(`Bitácora · ${fecha(b.fecha_jornada)}`, '<div class="vacio">Cargando…</div>', '<button class="btn" data-cerrar>Cerrar</button>'); const sub = await api.subtablas(b.id, { conConfidencial: false }); for (const f of sub.fotos) f._url = await api.urlFoto(f.storage_path); m.querySelector('#mBd').innerHTML = `<div class="small muted" style="margin-bottom:8px">Solo lectura. No se puede descargar ni modificar.</div><div class="lectura">${renderLectura({ b, sub, cat, est: e, monitora: moni, confidencial: false })}</div>`; });
}

/* ---------- Solicitudes ---------- */
function formVisita(v, alGuardar) {
  modal(`Solicitar visita escolar · ${esc(nombreCorto(v.estudiante.nombre))}`, `<div class="alerta" style="margin-bottom:12px"><span class="tx small">Tu solicitud llega a Dirección de SHADOW como pendiente. Enviarla no confirma la visita: Dirección valora la viabilidad y coordina fecha y condiciones contigo.</span></div>
    <div class="form"><div class="f"><label>Motivo de la solicitud *</label><input id="sv_m" placeholder="Ej. Dificultades en el recreo que quisiéramos observar juntos"></div><div class="f"><label>Objetivo de la visita</label><input id="sv_o" placeholder="Ej. Acordar estrategias de transición entre actividades"></div><div class="f"><label>Situaciones o necesidades que desean abordar</label><textarea id="sv_d"></textarea></div><div class="f"><label>Personas que consideras importante que participen</label><input id="sv_p" placeholder="Ej. maestra titular, psicóloga escolar"></div><div class="f"><label>Fechas u horarios propuestos (si los conoces)</label><input id="sv_f" placeholder="Ej. martes o jueves, de 9 a 11"></div><div class="f"><label>Información adicional</label><textarea id="sv_c"></textarea></div></div>`,
    `<button class="btn" data-cerrar>Cancelar</button><button class="btn p" id="sv_ok">Enviar solicitud</button>`);
  document.getElementById('sv_ok').onclick = async () => { if (!val('sv_m')) { toast('Escribe el motivo.'); return; } await api.crearSolicitud({ tipo: 'visita_escolar', estudiante_id: v.estudiante.id, datos: { motivo: val('sv_m'), objetivo: val('sv_o') || null, detalle: val('sv_d') || null, personas: val('sv_p') || null, fechas_propuestas: val('sv_f') || null, comentarios: val('sv_c') || null } }, perfil.id); cerrarModal(); toast('Solicitud enviada a Dirección de SHADOW'); alGuardar?.(); };
}
function formReporte(v, alGuardar) {
  modal(`Solicitar reporte · ${esc(nombreCorto(v.estudiante.nombre))}`, `<div class="alerta" style="margin-bottom:12px"><span class="tx small">El reporte no se genera automáticamente. Dirección revisa qué información es pertinente compartir contigo según tu función, lo prepara y autoriza su entrega.</span></div>
    <div class="form"><div class="f"><label>Motivo: qué información necesitas y por qué *</label><textarea id="sr_m" placeholder="Ej. Preparar la reunión interdisciplinaria del 15 de noviembre; necesito conocer cómo responde a las transiciones y qué estrategias están funcionando."></textarea></div><div class="f"><label>Objetivo del reporte</label><input id="sr_o" placeholder="Ej. Ajustar el plan de terapia de lenguaje"></div><div class="f"><label>Información específica que necesitas</label><textarea id="sr_i"></textarea></div><div class="form g2"><div class="f"><label>Periodo a revisar</label><input id="sr_p" placeholder="Ej. octubre"></div><div class="f"><label>Fecha límite (si existe)</label><input type="date" id="sr_f"></div></div><div class="f"><label>Comentarios adicionales</label><textarea id="sr_c"></textarea></div></div>`,
    `<button class="btn" data-cerrar>Cancelar</button><button class="btn p" id="sr_ok">Enviar solicitud</button>`);
  document.getElementById('sr_ok').onclick = async () => { if (!val('sr_m')) { toast('Explica qué necesitas y por qué.'); return; } await api.crearSolicitud({ tipo: 'reporte_especialista', estudiante_id: v.estudiante.id, datos: { motivo: val('sr_m'), objetivo: val('sr_o') || null, informacion: val('sr_i') || null, periodo: val('sr_p') || null, fecha_limite: val('sr_f') || null, comentarios: val('sr_c') || null } }, perfil.id); cerrarModal(); toast('Solicitud enviada a Dirección de SHADOW'); alGuardar?.(); };
}
async function solicitudes() {
  const sols = await api.solicitudesDe(perfil.id);
  vista.innerHTML = `<div class="row"><h1 class="titulo">Mis solicitudes</h1><div class="sp"></div>${estSel ? `<button class="btn" id="nVisita">Solicitar visita</button><button class="btn p" id="nReporte">Solicitar reporte</button>` : ''}</div><div class="subtitulo">Aquí ves el estado de cada petición sin tener que volver a enviarla.</div>
  <div class="card"><div class="bd sin"><ul class="lista">${sols.map(s => `<li class="click" data-sol="${s.id}"><div class="tx"><b>${TIPO_SOL[s.tipo] || s.tipo}</b><div class="m">${esc(nombreCorto(vinculos.find(v => v.estudiante.id === s.estudiante_id)?.estudiante.nombre || ''))} · ${esc(s.datos?.motivo || '')}<br>Enviada el ${fecha(s.creado_en)}${s.respuesta_direccion ? ' · SHADOW: ' + esc(s.respuesta_direccion) : ''}</div></div>${tagSol(s.estado)}</li>`).join('') || '<li class="vacio">Aún no has enviado solicitudes.</li>'}</ul></div></div>
  <div class="small muted" style="margin-top:10px">Estados: ${Object.values(ESTADOS_SOL).join(' · ')}.</div>`;
  vista.querySelectorAll('[data-sol]').forEach(li => li.onclick = () => verSolicitud(sols.find(s => s.id === li.dataset.sol)));
  document.getElementById('nVisita')?.addEventListener('click', () => formVisita(estSel, solicitudes)); document.getElementById('nReporte')?.addEventListener('click', () => formReporte(estSel, solicitudes));
}
async function verSolicitud(s) {
  const hist = await api.historialSolicitud(s.id); const d = s.datos || {};
  const campos = Object.entries({ motivo: 'Motivo', objetivo: 'Objetivo', informacion: 'Información que necesita', detalle: 'Situaciones a abordar', personas: 'Personas que deben participar', periodo: 'Periodo', fechas_propuestas: 'Fechas propuestas', fecha_limite: 'Fecha límite', comentarios: 'Comentarios' }).filter(([k]) => d[k]);
  modal(TIPO_SOL[s.tipo] || s.tipo, `<div class="row" style="margin-bottom:10px">${tagSol(s.estado)}</div><dl class="dl">${campos.map(([k, l]) => `<dt>${l}</dt><dd>${k.startsWith('fecha_l') ? fecha(d[k]) : esc(d[k])}</dd>`).join('')}</dl>${s.respuesta_direccion ? `<div class="alerta ok" style="margin-top:12px"><span class="tx"><b>SHADOW:</b> ${esc(s.respuesta_direccion)}</span></div>` : ''}<h4 style="margin:14px 0 6px">Seguimiento</h4><ul class="lista">${hist.map(h => `<li style="padding:6px 0"><div class="tx"><b>${ESTADOS_SOL[h.estado] || h.estado}</b><div class="m">${fecha(h.fecha)} ${hora(h.fecha)}${h.nota ? ' · ' + esc(h.nota) : ''}</div></div></li>`).join('')}</ul>`);
}

ir('inicio');
