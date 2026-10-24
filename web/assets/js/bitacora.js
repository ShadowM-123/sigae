/* SIGAE — bitácora diaria: formulario paso a paso (monitora) y lectura (familia, Dirección, monitora). */
import * as api from './api.js';
import { esc, fecha, fechaLarga, hora, horaCorta, hoyIso, toast, valoracionTexto, nombreCorto } from './ui.js';

const TOTAL = 15;

/* ---------- componentes de opciones ---------- */
const opciones = (nombre, items, sel = [], { multi = false, col1 = false } = {}) =>
  `<div class="opciones" data-grupo="${nombre}" data-multi="${multi ? 1 : 0}">${items.map(it => `<button type="button" class="opcion ${col1 ? 'col1' : ''} ${sel.includes(it.clave) ? 'on' : ''}" data-val="${esc(it.clave)}">${esc(it.etiqueta)}</button>`).join('')}</div>`;
const seleccion = (root, nombre) => [...root.querySelectorAll(`[data-grupo="${nombre}"] .opcion.on`)].map(b => b.dataset.val);
const siNo = (nombre, valor) => opciones(nombre, [{ clave: 'si', etiqueta: 'Sí' }, { clave: 'no', etiqueta: 'No' }], valor === true ? ['si'] : valor === false ? ['no'] : []);
const leerSiNo = (root, nombre) => { const s = seleccion(root, nombre)[0]; return s === 'si' ? true : s === 'no' ? false : null; };

/* ---------- formulario paso a paso ---------- */
export async function armarWizard(root, ctx) {
  const { estudiante: est, perfil, cat } = ctx;
  let b = ctx.bitacora; let sub = ctx.sub || { bloques: [], banos: [], fotos: [], sentir: null };
  const eraCorreccion = b?.estado === 'requiere_correccion';

  // Garantiza que exista la fila (borrador) para poder guardar subtablas y fotos.
  if (!b) {
    b = await api.guardarBitacora({ estudiante_id: est.id, monitora_id: perfil.id, asignacion_id: est.asignacion?.id || null, fecha_jornada: ctx.fechaJornada || hoyIso(), estado: 'borrador', paso_actual: 0, conductas: [], estados_animo: [] });
    sub = { bloques: [], banos: [], fotos: [], sentir: null };
  }
  if (!sub.bloques.length) sub.bloques = api.bloquesDelHorario(est);
  let paso = Math.min(b.paso_actual || 0, TOTAL - 1);

  const PASOS = [
    { // 0 — A
      titulo: 'Fecha y valoración del día', ayuda: 'La fecha de hoy ya está puesta. Si registras una jornada atrasada, cámbiala: se conservan la fecha real y la de envío.',
      render: () => `<div class="f"><label>Fecha de la jornada</label><input type="date" id="w_fecha" value="${b.fecha_jornada}" max="${hoyIso()}"></div>
        <div class="f" style="margin-top:14px"><label>¿Cómo percibiste el día de ${esc(nombreCorto(est.nombre))}? <span class="muted">1 = jornada muy difícil · 5 = jornada muy buena</span></label>
        <div class="escala" data-grupo="val" data-multi="0">${[1, 2, 3, 4, 5].map(n => `<button type="button" class="opcion ${b.valoracion_dia === n ? 'on' : ''}" data-val="${n}">${n}</button>`).join('')}</div>
        <div class="small muted" style="display:flex;justify-content:space-between;margin-top:4px"><span>Muy difícil</span><span>Muy bueno</span></div></div>`,
      leer: () => { const f = root.querySelector('#w_fecha').value; const v = Number(seleccion(root, 'val')[0]); if (!f) return 'Falta la fecha.'; if (!v) return 'Elige un número del 1 al 5.'; b.fecha_jornada = f; b.valoracion_dia = v; },
    },
    { // 1 — B
      titulo: 'Tareas y pendientes escolares', ayuda: '¿Hay tareas, actividades pendientes o indicaciones que deban atenderse?',
      render: () => `${siNo('tareas', b.hay_tareas)}<div class="f" id="w_tareas_box" style="margin-top:12px;${b.hay_tareas ? '' : 'display:none'}"><label>¿Cuáles?</label><textarea id="w_tareas" placeholder="Ej. Terminar la página 34 y traer firmada la circular.">${esc(b.tareas_pendientes || '')}</textarea></div>`,
      despues: () => root.querySelector('[data-grupo="tareas"]').addEventListener('click', () => { root.querySelector('#w_tareas_box').style.display = leerSiNo(root, 'tareas') ? '' : 'none'; }),
      leer: () => { const v = leerSiNo(root, 'tareas'); if (v === null) return 'Indica si hay tareas o pendientes.'; b.hay_tareas = v; b.tareas_pendientes = v ? root.querySelector('#w_tareas').value.trim() : null; if (v && !b.tareas_pendientes) return 'Anota cuáles son.'; },
    },
    { // 2 — C
      titulo: 'Alimentación durante el recreo', ayuda: '¿Comió su lonche?',
      render: () => opciones('lonche', cat.lonche, [b.lonche].filter(Boolean), { col1: true }),
      leer: () => { const v = seleccion(root, 'lonche')[0]; if (!v) return 'Elige una opción.'; b.lonche = v; },
    },
    { // 3 — D
      titulo: 'Uso del baño', ayuda: '¿Fue al baño durante la jornada? Registra cada vez con la hora aproximada.',
      render: () => `${siNo('bano', b.fue_al_bano)}<div id="w_banos" style="margin-top:12px;${b.fue_al_bano ? '' : 'display:none'}">${pintarBanos()}</div>`,
      despues: () => { root.querySelector('[data-grupo="bano"]').addEventListener('click', () => { const si = leerSiNo(root, 'bano'); root.querySelector('#w_banos').style.display = si ? '' : 'none'; if (si && !sub.banos.length) { sub.banos.push({ hora_aprox: '', que_hizo: '', nota: '' }); root.querySelector('#w_banos').innerHTML = pintarBanos(); engancharBanos(); } }); engancharBanos(); },
      leer: () => { const v = leerSiNo(root, 'bano'); if (v === null) return 'Indica si fue al baño.'; b.fue_al_bano = v; leerBanos(); if (v) { sub.banos = sub.banos.filter(x => x.hora_aprox || x.que_hizo); if (!sub.banos.length) return 'Agrega al menos una vez con hora y qué hizo.'; if (sub.banos.some(x => !x.que_hizo)) return 'Falta indicar qué hizo en alguna de las veces.'; } else sub.banos = []; },
      guardar: () => api.guardarBanos(b.id, sub.banos),
    },
    { // 4 — E
      titulo: 'Conductas que requieren seguimiento', ayuda: '¿Se presentaron conductas que requieren atención? Puedes marcar varias.',
      render: () => { const sel = b.conductas?.length ? b.conductas : []; const hay = sel.some(c => c !== 'ninguna'); const d = b.conducta_detalle || {}; return `${opciones('cond', cat.conducta, sel, { multi: true, col1: true })}
        <div id="w_cond_det" style="margin-top:12px;${hay ? '' : 'display:none'}" class="form">
          <div class="alerta conf"><span class="tx">Describe la situación para que sirva al seguimiento, no solo como etiqueta.</span></div>
          <div class="f"><label>¿Qué ocurrió antes?</label><textarea id="w_c_antes">${esc(d.antes || '')}</textarea></div>
          <div class="f"><label>¿Qué hizo ${esc(nombreCorto(est.nombre))}?</label><textarea id="w_c_que">${esc(d.que_hizo || '')}</textarea></div>
          <div class="f"><label>¿Qué sucedió después?</label><textarea id="w_c_desp">${esc(d.despues || '')}</textarea></div>
          <div class="f"><label>¿Cómo respondiste tú?</label><textarea id="w_c_resp">${esc(d.respuesta || '')}</textarea></div></div>`; },
      despues: () => root.querySelector('[data-grupo="cond"]').addEventListener('click', e => { const btn = e.target.closest('.opcion'); if (!btn) return; const g = root.querySelector('[data-grupo="cond"]'); if (btn.dataset.val === 'ninguna' && btn.classList.contains('on')) g.querySelectorAll('.opcion').forEach(o => { if (o !== btn) o.classList.remove('on'); }); else if (btn.classList.contains('on')) g.querySelector('[data-val="ninguna"]')?.classList.remove('on'); root.querySelector('#w_cond_det').style.display = seleccion(root, 'cond').some(c => c !== 'ninguna') ? '' : 'none'; }),
      leer: () => { const s = seleccion(root, 'cond'); if (!s.length) return 'Elige una opción.'; b.conductas = s; if (s.some(c => c !== 'ninguna')) { b.conducta_detalle = { antes: root.querySelector('#w_c_antes').value.trim(), que_hizo: root.querySelector('#w_c_que').value.trim(), despues: root.querySelector('#w_c_desp').value.trim(), respuesta: root.querySelector('#w_c_resp').value.trim() }; if (Object.values(b.conducta_detalle).some(x => !x)) return 'Completa las cuatro partes de la descripción.'; } else b.conducta_detalle = null; },
    },
    { // 5 — F
      titulo: 'Habilidades sociales e interacción', ayuda: '¿Desarrolló habilidades sociales o interactuó con otros niños?',
      render: () => `${siNo('hab', b.habilidades_sociales)}<div class="f" style="margin-top:12px"><label>Descripción breve (opcional)</label><textarea id="w_hab" placeholder="Con quién, en qué momento, qué observaste.">${esc(b.habilidades_detalle || '')}</textarea></div>`,
      leer: () => { const v = leerSiNo(root, 'hab'); if (v === null) return 'Elige sí o no.'; b.habilidades_sociales = v; b.habilidades_detalle = root.querySelector('#w_hab').value.trim() || null; },
    },
    { // 6 — G
      titulo: 'Trabajo durante las clases', ayuda: `Horario de ${esc(nombreCorto(est.nombre))}: ${horaCorta(est.hora_entrada)} a ${horaCorta(est.hora_salida)}. Marca cómo trabajó en cada periodo de 30 minutos.`,
      render: () => `<div class="bloques">${sub.bloques.map((bl, i) => `<div class="bloque ${bl.recreo || bl.valor === 'no_aplica' && esRecreo(bl) ? 'na' : ''}" data-i="${i}"><div class="h">${bl.hora_inicio}–${bl.hora_fin}${esRecreo(bl) ? ' · recreo' : ''}</div><div class="vals">${cat.valor_bloque.filter(v => v.clave !== 'no_aplica' || esRecreo(bl) || bl.valor === 'no_aplica').map(v => `<button type="button" class="b-${v.clave} ${bl.valor === v.clave ? 'on' : ''}" data-v="${v.clave}" title="${esc(v.etiqueta)}">${esc(v.etiqueta.replace('Trabajó con apoyo', 'Con apoyo').replace('No trabajó', 'No'))}</button>`).join('')}</div></div>`).join('')}</div>
        <div class="row" style="margin-top:10px"><button type="button" class="btn s" id="w_todo_trabajo">Marcar todos como «Trabajó»</button><span class="small muted">y luego cambia los que fueron distintos</span></div>`,
      despues: () => { root.querySelector('.bloques').addEventListener('click', e => { const btn = e.target.closest('button[data-v]'); if (!btn) return; const bl = btn.closest('.bloque'); bl.querySelectorAll('button').forEach(x => x.classList.remove('on')); btn.classList.add('on'); sub.bloques[Number(bl.dataset.i)].valor = btn.dataset.v; }); root.querySelector('#w_todo_trabajo').onclick = () => { sub.bloques.forEach(bl => { if (!esRecreo(bl)) bl.valor = 'trabajo'; }); pintar(); }; },
      leer: () => { if (sub.bloques.some(bl => !bl.valor)) return 'Falta marcar algún periodo.'; },
      guardar: () => api.guardarBloques(b.id, sub.bloques),
    },
    { // 7 — H
      titulo: 'Realización de actividades escolares', ayuda: '¿Realizó y terminó las actividades propuestas para la clase?',
      render: () => opciones('acts', cat.actividades_realizadas, [b.actividades_realizadas].filter(Boolean), { col1: true }),
      leer: () => { const v = seleccion(root, 'acts')[0]; if (!v) return 'Elige una opción.'; b.actividades_realizadas = v; },
    },
    { // 8 — I
      titulo: 'Participación en las actividades de la maestra', ayuda: '¿Participó activamente en las actividades que propuso la maestra?',
      render: () => opciones('part', cat.participacion, [b.participacion].filter(Boolean), { col1: true }),
      leer: () => { const v = seleccion(root, 'part')[0]; if (!v) return 'Elige una opción.'; b.participacion = v; },
    },
    { // 9 — J
      titulo: 'Estado de ánimo del estudiante', ayuda: 'Puedes marcar uno o varios.',
      render: () => `${opciones('animo', cat.estado_animo_estudiante, b.estados_animo || [], { multi: true })}<div class="f" id="w_animo_otro_box" style="margin-top:12px;${(b.estados_animo || []).includes('otro') ? '' : 'display:none'}"><label>¿Cuál?</label><input id="w_animo_otro" value="${esc(b.estado_animo_otro || '')}"></div>`,
      despues: () => root.querySelector('[data-grupo="animo"]').addEventListener('click', () => { root.querySelector('#w_animo_otro_box').style.display = seleccion(root, 'animo').includes('otro') ? '' : 'none'; }),
      leer: () => { const s = seleccion(root, 'animo'); if (!s.length) return 'Marca al menos uno.'; b.estados_animo = s; b.estado_animo_otro = s.includes('otro') ? root.querySelector('#w_animo_otro').value.trim() : null; if (s.includes('otro') && !b.estado_animo_otro) return 'Especifica el otro estado de ánimo.'; },
    },
    { // 10 — K
      titulo: 'Evidencias fotográficas', ayuda: 'Opcional. Fotos de trabajos o actividades relevantes para el seguimiento. Solo las ven la familia y Dirección.',
      render: () => `<div class="fotos" id="w_fotos">${sub.fotos.map(f => `<div style="position:relative"><img src="${f._url || ''}" alt=""><button type="button" class="btn s peligro" data-borrar="${f.id}" style="position:absolute;top:6px;right:6px;padding:2px 8px;min-height:0">×</button></div>`).join('')}<label class="mas">＋ Agregar foto<input type="file" accept="image/*" capture="environment" multiple style="display:none" id="w_foto_in"></label></div>`,
      despues: () => { root.querySelector('#w_foto_in').onchange = async e => { for (const file of e.target.files) { toast('Subiendo foto…'); const f = await api.subirFoto(b.id, perfil.id, file); f._url = await api.urlFoto(f.storage_path); sub.fotos.push(f); } pintar(); }; root.querySelectorAll('[data-borrar]').forEach(btn => btn.onclick = async () => { const f = sub.fotos.find(x => x.id === btn.dataset.borrar); await api.borrarFoto(f); sub.fotos = sub.fotos.filter(x => x !== f); pintar(); }); },
      leer: () => {},
    },
    { // 11 — L
      titulo: 'Resumen narrativo del día', ayuda: 'Lo más relevante: avances, dificultades y lo que la familia debe saber. Complementa lo anterior, no lo repite.',
      render: () => `<div class="f"><textarea id="w_res" style="min-height:160px" placeholder="Ej. Buen día en general. Toleró el cambio al salón de música con aviso previo…">${esc(b.resumen_narrativo || '')}</textarea></div>`,
      leer: () => { const v = root.querySelector('#w_res').value.trim(); if (v.length < 20) return 'Escribe un resumen de al menos una o dos frases.'; b.resumen_narrativo = v; },
    },
    { // 12 — M (confidencial)
      titulo: '¿Cómo me sentí como monitora?', ayuda: 'Tu bienestar también influye en el acompañamiento. Esto lo ve solo Dirección: no lo ve la familia, no lo ven especialistas y no sale en ninguna descarga. No es para evaluarte, es para cuidarte.',
      render: () => { const s = sub.sentir || { sentimientos: [] }; return `<div class="alerta conf" style="margin-bottom:12px"><span class="tx"><b>Confidencial.</b> Solo Dirección puede leer esta sección.</span></div>${opciones('sentir', cat.sentir_monitora, s.sentimientos || [], { multi: true })}
        <div class="f" id="w_sentir_otra_box" style="margin-top:12px;${(s.sentimientos || []).includes('otra') ? '' : 'display:none'}"><label>¿Cuál?</label><input id="w_sentir_otra" value="${esc(s.otro || '')}"></div>
        <div class="f" style="margin-top:12px"><label>¿Quieres contar algo más? (opcional) Situaciones que te generaron incomodidad, estrés o dificultad.</label><textarea id="w_sentir_com">${esc(s.comentario || '')}</textarea></div>`; },
      despues: () => root.querySelector('[data-grupo="sentir"]').addEventListener('click', () => { root.querySelector('#w_sentir_otra_box').style.display = seleccion(root, 'sentir').includes('otra') ? '' : 'none'; }),
      leer: () => { const s = seleccion(root, 'sentir'); if (!s.length) return 'Marca al menos una opción.'; sub.sentir = { sentimientos: s, otro: s.includes('otra') ? root.querySelector('#w_sentir_otra').value.trim() : null, comentario: root.querySelector('#w_sentir_com').value.trim() || null }; },
      guardar: () => api.guardarSentir(b.id, sub.sentir),
    },
    { // 13 — N
      titulo: 'Comentarios adicionales', ayuda: 'Opcional. Cualquier cosa que no haya cabido en las preguntas anteriores.',
      render: () => `<div class="f"><textarea id="w_com">${esc(b.comentarios_adicionales || '')}</textarea></div>`,
      leer: () => { b.comentarios_adicionales = root.querySelector('#w_com').value.trim() || null; },
    },
    { // 14 — revisar y enviar
      titulo: 'Revisa y envía', ayuda: 'Así quedará la bitácora. Puedes regresar a cualquier paso para corregir.',
      render: () => `<div class="lectura card"><div class="bd">${renderLectura({ b, sub, cat, est, confidencial: true })}</div></div>`,
      leer: () => {},
    },
  ];

  function esRecreo(bl) { if (bl.recreo) return true; if (!est.hora_recreo_inicio) return false; return bl.hora_inicio >= est.hora_recreo_inicio.slice(0, 5) && bl.hora_inicio < est.hora_recreo_fin.slice(0, 5); }
  function pintarBanos() { return sub.banos.map((x, i) => `<div class="card" style="margin-bottom:8px"><div class="bd"><div class="row"><b>Vez ${i + 1}</b><div class="sp"></div><button type="button" class="btn s" data-quitar="${i}">Quitar</button></div><div class="form g2" style="margin-top:8px"><div class="f"><label>Hora aproximada</label><input type="time" data-hora="${i}" value="${esc(x.hora_aprox || '')}"></div><div class="f"><label>¿Qué hizo?</label><select data-que="${i}"><option value="">Elige…</option>${cat.uso_bano.map(o => `<option value="${o.clave}" ${x.que_hizo === o.clave ? 'selected' : ''}>${esc(o.etiqueta)}</option>`).join('')}</select></div><div class="f full"><label>Nota (opcional)</label><input data-nota="${i}" value="${esc(x.nota || '')}" placeholder="Ej. avisó solo, necesitó apoyo…"></div></div></div></div>`).join('') + `<button type="button" class="btn" id="w_mas_bano">＋ Otra vez al baño</button>`; }
  function leerBanos() { sub.banos.forEach((x, i) => { x.hora_aprox = root.querySelector(`[data-hora="${i}"]`)?.value || ''; x.que_hizo = root.querySelector(`[data-que="${i}"]`)?.value || ''; x.nota = root.querySelector(`[data-nota="${i}"]`)?.value || ''; }); }
  function engancharBanos() { const box = root.querySelector('#w_banos'); if (!box) return; box.querySelector('#w_mas_bano').onclick = () => { leerBanos(); sub.banos.push({ hora_aprox: '', que_hizo: '', nota: '' }); box.innerHTML = pintarBanos(); engancharBanos(); }; box.querySelectorAll('[data-quitar]').forEach(btn => btn.onclick = () => { leerBanos(); sub.banos.splice(Number(btn.dataset.quitar), 1); box.innerHTML = pintarBanos(); engancharBanos(); }); }

  async function cargarUrlsFotos() { for (const f of sub.fotos) if (!f._url) f._url = await api.urlFoto(f.storage_path); }

  async function guardarPaso(i) {
    const p = PASOS[i]; const err = p.leer(); if (err) { toast(err); return false; }
    b.paso_actual = Math.max(b.paso_actual || 0, i + 1);
    if (b.estado !== 'requiere_correccion') b.estado = b.estado === 'enviada' || b.estado === 'corregida' ? b.estado : 'borrador';
    const { _url, ...limpio } = b; b = await api.guardarBitacora(limpio);
    if (p.guardar) await p.guardar();
    return true;
  }

  async function enviar() {
    for (let i = 0; i < TOTAL - 1; i++) { if (i === 10 || i === 13 || i === 5) continue; /* opcionales */ }
    const faltan = [b.valoracion_dia, b.lonche, b.actividades_realizadas, b.participacion, b.resumen_narrativo].some(x => !x) || !(b.estados_animo || []).length || !(b.conductas || []).length || b.hay_tareas == null || b.fue_al_bano == null || b.habilidades_sociales == null || !sub.sentir;
    if (faltan) { toast('Aún faltan pasos por contestar. Regresa con «Atrás».'); return; }
    b.estado = eraCorreccion ? 'corregida' : 'enviada'; b.enviada_en = new Date().toISOString(); b.paso_actual = TOTAL;
    if (eraCorreccion) { b.revisada_en = null; b.revisada_por = null; }
    b = await api.guardarBitacora(b);
    toast('Bitácora enviada. ¡Gracias!');
    ctx.alTerminar?.(b);
  }

  async function pintar() {
    if (paso === 10) await cargarUrlsFotos();
    const p = PASOS[paso];
    root.innerHTML = `<div class="wiz">
      <div class="row"><span class="paso-n">Paso ${paso + 1} de ${TOTAL}</span><div class="sp"></div><span class="small muted">${esc(nombreCorto(est.nombre))} · ${fecha(b.fecha_jornada)}</span></div>
      <div class="prog"><i style="width:${Math.round(100 * (paso) / (TOTAL - 1))}%"></i></div>
      ${eraCorreccion && b.observacion_direccion ? `<div class="alerta bad" style="margin-bottom:12px"><span class="tx"><b>Dirección pidió una corrección:</b> ${esc(b.observacion_direccion)}</span></div>` : ''}
      <h2>${p.titulo}</h2><div class="ayuda">${p.ayuda}</div>
      <div id="w_cuerpo">${p.render()}</div>
      <div class="acciones">${paso > 0 ? '<button type="button" class="btn" id="w_atras">Atrás</button>' : `<button type="button" class="btn" id="w_salir">Guardar y salir</button>`}
        ${paso < TOTAL - 1 ? '<button type="button" class="btn p" id="w_sig">Guardar y seguir</button>' : `<button type="button" class="btn p" id="w_enviar">${eraCorreccion ? 'Enviar corrección' : 'Enviar bitácora'}</button>`}</div>
      <div class="small muted" style="text-align:center;margin-top:6px">Se guarda en cada paso. Puedes salir y retomar después.</div></div>`;
    // selección por botones
    root.querySelectorAll('.opciones, .escala').forEach(g => g.addEventListener('click', e => { const btn = e.target.closest('.opcion'); if (!btn) return; if (g.dataset.multi === '1') btn.classList.toggle('on'); else { g.querySelectorAll('.opcion').forEach(o => o.classList.remove('on')); btn.classList.add('on'); } }));
    p.despues?.();
    root.querySelector('#w_atras')?.addEventListener('click', async () => { p.leer(); paso--; pintar(); window.scrollTo(0, 0); });
    root.querySelector('#w_salir')?.addEventListener('click', async () => { await guardarPaso(paso).catch(() => {}); ctx.alSalir?.(b); });
    root.querySelector('#w_sig')?.addEventListener('click', async () => { if (await guardarPaso(paso)) { paso++; pintar(); window.scrollTo(0, 0); } });
    root.querySelector('#w_enviar')?.addEventListener('click', enviar);
  }
  pintar();
  return { get bitacora() { return b; } };
}

/* ---------- lectura ---------- */
export function porcentajeAvance(b) { return Math.round(100 * Math.min(b.paso_actual || 0, TOTAL) / TOTAL); }

/** HTML de una bitácora para leer. `confidencial` incluye la sección «¿Cómo me sentí?» (solo monitora dueña y Dirección). */
export function renderLectura({ b, sub, cat, est, monitora, confidencial = false, fotosUrls }) {
  const E = (t, k) => cat._etiqueta ? cat._etiqueta(t, k) : k;
  const nombre = nombreCorto(est?.nombre || 'el estudiante');
  const animo = (b.estados_animo || []).map(k => k === 'otro' && b.estado_animo_otro ? b.estado_animo_otro : E('estado_animo_estudiante', k));
  const conductas = (b.conductas || []);
  const hayConducta = conductas.some(c => c !== 'ninguna');
  const bloques = (sub?.bloques || []);
  const fotos = (sub?.fotos || []).map((f, i) => f._url || (fotosUrls && fotosUrls[i]) || '').filter(Boolean);
  const sec = (t, cuerpo) => `<div class="sec"><h4>${t}</h4>${cuerpo}</div>`;
  return `
  ${sec('Día', `<p><b>${fechaLarga(b.fecha_jornada)}</b>${monitora ? ` · Monitora: ${esc(monitora.nombre)}` : ''}${b.enviada_en ? ` · Enviada ${fecha(b.enviada_en)} ${hora(b.enviada_en)}` : ' · <span class="tag warn">Borrador</span>'}</p>`)}
  ${sec('Valoración general del día', b.valoracion_dia ? `<div class="row"><span class="val">${b.valoracion_dia}<span class="muted" style="font-size:16px">/5</span></span><span>${valoracionTexto(b.valoracion_dia)}</span></div>` : '<p class="muted">Sin contestar</p>')}
  ${b.resumen_narrativo ? sec('Resumen del día', `<p>${esc(b.resumen_narrativo).replace(/\n/g, '<br>')}</p>`) : ''}
  ${sec('Tareas y pendientes', b.hay_tareas == null ? '<p class="muted">Sin contestar</p>' : b.hay_tareas ? `<p>${esc(b.tareas_pendientes)}</p>` : '<p>Sin tareas ni pendientes.</p>')}
  ${sec('Alimentación en el recreo', `<p>${b.lonche ? E('lonche', b.lonche) : '<span class="muted">Sin contestar</span>'}</p>`)}
  ${sec('Uso del baño', b.fue_al_bano == null ? '<p class="muted">Sin contestar</p>' : !b.fue_al_bano ? '<p>No fue al baño durante la jornada.</p>' : `<p>${(sub?.banos || []).map(x => `${horaCorta(x.hora_aprox) || 'hora s/d'} · ${E('uso_bano', x.que_hizo)}${x.nota ? ` <span class="muted">(${esc(x.nota)})</span>` : ''}`).join('<br>') || 'Sí, sin detalle.'}</p>`)}
  ${sec('Conductas que requieren seguimiento', !conductas.length ? '<p class="muted">Sin contestar</p>' : !hayConducta ? '<p>No se presentaron.</p>' : `<div class="chips">${conductas.filter(c => c !== 'ninguna').map(c => `<span>${E('conducta', c)}</span>`).join('')}</div>${b.conducta_detalle ? `<p><b>Antes:</b> ${esc(b.conducta_detalle.antes)}<br><b>Qué hizo:</b> ${esc(b.conducta_detalle.que_hizo)}<br><b>Después:</b> ${esc(b.conducta_detalle.despues)}<br><b>Respuesta de la monitora:</b> ${esc(b.conducta_detalle.respuesta)}</p>` : ''}`)}
  ${sec('Habilidades sociales e interacción', b.habilidades_sociales == null ? '<p class="muted">Sin contestar</p>' : `<p>${b.habilidades_sociales ? 'Sí.' : 'No se observó.'}${b.habilidades_detalle ? ' ' + esc(b.habilidades_detalle) : ''}</p>`)}
  ${sec('Trabajo durante las clases', bloques.length ? `<div class="mini-bloques">${bloques.map(bl => `<span class="${bl.valor || ''}">${bl.hora_inicio}<b>${bl.valor ? E('valor_bloque', bl.valor).replace('Trabajó con apoyo', 'Con apoyo').replace('No aplica', 'Recreo').replace('No trabajó', 'No') : '—'}</b></span>`).join('')}</div><div class="leyenda"><span><i style="background:var(--green-2)"></i>Trabajó</span><span><i style="background:var(--amber-2)"></i>Con apoyo</span><span><i style="background:var(--red-2)"></i>No trabajó</span><span><i style="background:#EEF0F4"></i>Recreo / no aplica</span></div>` : '<p class="muted">Sin registrar</p>')}
  ${sec('Actividades escolares', `<p>${b.actividades_realizadas ? 'Realizó y terminó: ' + E('actividades_realizadas', b.actividades_realizadas).toLowerCase() : '<span class="muted">Sin contestar</span>'}</p>`)}
  ${sec('Participación con la maestra', `<p>${b.participacion ? 'Participó ' + E('participacion', b.participacion).toLowerCase() + ' las actividades' : '<span class="muted">Sin contestar</span>'}</p>`)}
  ${sec('Estado de ánimo observado', animo.length ? `<div class="chips">${animo.map(a => `<span>${esc(a)}</span>`).join('')}</div>` : '<p class="muted">Sin contestar</p>')}
  ${fotos.length ? sec('Evidencias', `<div class="fotos">${fotos.map(u => `<img src="${u}" alt="Evidencia">`).join('')}</div>`) : ''}
  ${b.comentarios_adicionales ? sec('Comentarios adicionales', `<p>${esc(b.comentarios_adicionales)}</p>`) : ''}
  ${confidencial && sub?.sentir ? `<div class="sec conf"><h4>¿Cómo me sentí como monitora? <span class="tag conf">Confidencial · solo Dirección</span></h4><div class="chips">${(sub.sentir.sentimientos || []).map(k => `<span>${esc(k === 'otra' && sub.sentir.otro ? sub.sentir.otro : E('sentir_monitora', k))}</span>`).join('')}</div>${sub.sentir.comentario ? `<p>${esc(sub.sentir.comentario)}</p>` : ''}</div>` : ''}`;
}
