/* SIGAE — Dirección, paso F: Academia SHADOW (cursos, lecciones, evaluaciones, avance por monitora),
   biblioteca de materiales para monitoras con bandeja de aprobación y recursos para familias. */
import * as api from './api.js';
import { esc, fecha, hora, hoyIso, sumarDias, toast, modal, cerrarModal, val, nombreCorto } from './ui.js';
import { TIPO_LECCION, ICONO_LECCION, avanceDe, barra, htmlCursos, parsearPreguntas, textoPreguntas, htmlVideo } from './academia.js';
import { TIPO_MAT, ICONO_MAT, tagMat, abrirMaterial, formMaterial } from './materiales.js';

const hoy = hoyIso();

/* ======================= Academia ======================= */
async function cargarAcademia() {
  const [cursos, lecciones, cuestionarios, progreso, intentos, monis] = await Promise.all([api.cursos(), api.lecciones(), api.cuestionarios(), api.progreso(), api.intentos(), api.monitoras()]);
  const activas = monis.filter(m => (m.estado || 'activa') === 'activa');
  const avances = activas.map(m => ({ m, av: avanceDe({ cursos: cursos.filter(c => c.publicado), lecciones, cuestionarios, progreso, intentos, perfilId: m.id }) }));
  return { cursos, lecciones, cuestionarios, progreso, intentos, monis: activas, avances };
}

export async function academia(vista, ctx, params = {}) {
  const d = await cargarAcademia();
  const acc = await api.accesosDe(d.monis.map(m => m.id), sumarDias(hoy, -30) + 'T00:00:00');
  const recargar = () => academia(vista, ctx);
  vista.innerHTML = `<div class="row"><h1 class="titulo">Academia SHADOW</h1><div class="sp"></div><button class="btn p" id="acNuevo">＋ Curso</button></div>
  <div class="subtitulo">Inducción y capacitación continua para las monitoras. Cada curso tiene lecciones (videos en YouTube no listado o Vimeo, documentos, lecturas) y una evaluación breve. Solo los cursos publicados se ven.</div>
  <div class="grid g-21">
    <div class="col" style="gap:12px">
      ${d.cursos.map(c => { const ls = d.lecciones.filter(l => l.curso_id === c.id); const q = d.cuestionarios.find(x => x.curso_id === c.id); const comp = d.avances.filter(a => a.av.porCurso.find(x => x.curso.id === c.id)?.completo).length; return `<div class="card curso"><div class="hd"><h3>${esc(c.titulo)}</h3>${c.obligatorio ? '<span class="tag conf">Obligatorio</span>' : ''}${c.publicado ? '<span class="tag ok">Publicado</span>' : '<span class="tag gray">Borrador</span>'}<div class="sp"></div><span class="small muted">${c.publicado ? `${comp}/${d.monis.length} monitoras lo completaron` : 'no visible aún'}</span></div>
        <div class="bd">${c.descripcion ? `<p class="small">${esc(c.descripcion)}</p>` : ''}<div class="small muted">${ls.length} ${ls.length === 1 ? 'lección' : 'lecciones'} · ${(q?.preguntas || []).length} pregunta${(q?.preguntas || []).length === 1 ? '' : 's'} en la evaluación${q ? ` · mínimo ${q.minimo_aprobatorio} %` : ''}</div>
        <div class="row" style="gap:6px;margin-top:10px"><button class="btn s" data-lec="${c.id}">Lecciones</button><button class="btn s" data-quiz="${c.id}">Evaluación</button><button class="btn s" data-edit="${c.id}">Editar</button><button class="btn s ${c.publicado ? '' : 'p'}" data-pub="${c.id}">${c.publicado ? 'Despublicar' : 'Publicar'}</button></div></div></div>`; }).join('') || '<div class="card"><div class="vacio">Aún no hay cursos. Crea el primero con «＋ Curso»: por ejemplo, la inducción a SHADOW.</div></div>'}
    </div>
    <div class="card"><div class="hd"><h3>Avance por monitora</h3></div><div class="bd sin"><ul class="lista">${d.avances.map(({ m, av }) => { const a = acc.filter(x => x.perfil_id === m.id); const ult = a.map(x => x.fecha_hora).sort().pop(); return `<li class="click" data-moni="${m.id}"><div class="tx"><b>${esc(nombreCorto(m.nombre))}</b><div class="m">${av.completos}/${av.total} cursos · ${av.pendientesObligatorios.length ? `<span style="color:var(--red)">${av.pendientesObligatorios.length} obligatorio${av.pendientesObligatorios.length > 1 ? 's' : ''} pendiente${av.pendientesObligatorios.length > 1 ? 's' : ''}</span>` : 'al día con lo obligatorio'} · ${a.length} accesos en 30 d${ult ? ` · último ${fecha(ult)}` : ''}</div>${barra(av.pctGlobal, av.completos === av.total && av.total ? 'ok' : '')}</div><b class="mono">${av.pctGlobal} %</b></li>`; }).join('') || '<li class="vacio">Sin monitoras activas.</li>'}</ul></div><div class="bd small muted" style="border-top:1px solid var(--line)">Toca una monitora para ver lección por lección y sus intentos en las evaluaciones.</div></div>
  </div>`;
  document.getElementById('acNuevo').onclick = () => editarCurso(null, d, ctx, recargar);
  vista.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => editarCurso(d.cursos.find(c => c.id === b.dataset.edit), d, ctx, recargar));
  vista.querySelectorAll('[data-lec]').forEach(b => b.onclick = () => lecciones(d.cursos.find(c => c.id === b.dataset.lec), d, ctx, recargar));
  vista.querySelectorAll('[data-quiz]').forEach(b => b.onclick = () => editarCuestionario(d.cursos.find(c => c.id === b.dataset.quiz), d, recargar));
  vista.querySelectorAll('[data-pub]').forEach(b => b.onclick = async () => { const c = d.cursos.find(x => x.id === b.dataset.pub); if (!c.publicado && !d.lecciones.some(l => l.curso_id === c.id)) { toast('Agrega al menos una lección antes de publicar.'); return; } await api.guardarCurso({ id: c.id, publicado: !c.publicado }); toast(c.publicado ? 'Curso despublicado' : 'Curso publicado: ya lo ven las monitoras'); recargar(); });
  vista.querySelectorAll('[data-moni]').forEach(li => li.onclick = () => verAvance(d.avances.find(a => a.m.id === li.dataset.moni), d));
  if (params.curso) lecciones(d.cursos.find(c => c.id === params.curso), d, ctx, recargar);
}

function editarCurso(c, d, ctx, alGuardar) {
  const v = c || {};
  modal(c ? 'Editar curso' : 'Nuevo curso', `<div class="form"><div class="f"><label>Título</label><input id="cu_t" value="${esc(v.titulo || '')}" placeholder="Ej. Inducción a SHADOW"></div><div class="f"><label>Descripción</label><textarea id="cu_d">${esc(v.descripcion || '')}</textarea></div><div class="form g2"><div class="f"><label>Orden</label><input type="number" id="cu_o" value="${v.orden || d.cursos.length + 1}"></div><label class="chk" style="align-self:end"><input type="checkbox" id="cu_ob" ${v.obligatorio ? 'checked' : ''}> Obligatorio para todas</label></div><div class="small muted">Después de guardar, agrega las lecciones y la evaluación. El curso se publica cuando tú lo decidas.</div></div>`, `<button class="btn" data-cerrar>Cancelar</button><button class="btn p" id="cu_ok">Guardar</button>`);
  document.getElementById('cu_ok').onclick = async () => { if (!val('cu_t')) { toast('Falta el título.'); return; } await api.guardarCurso({ ...(c ? { id: c.id } : { publicado: false, creado_por: ctx.perfil.id }), titulo: val('cu_t'), descripcion: val('cu_d') || null, orden: Number(val('cu_o')) || 1, obligatorio: val('cu_ob') }); cerrarModal(); toast('Curso guardado'); alGuardar(); };
}

function lecciones(c, d, ctx, alCambiar) {
  const ls = d.lecciones.filter(l => l.curso_id === c.id).sort((a, b) => a.orden - b.orden);
  modal(`Lecciones · ${esc(c.titulo)}`, `<ul class="lista">${ls.map(l => `<li><span class="ava" style="background:var(--sky);color:var(--navy)">${ICONO_LECCION[l.tipo]}</span><div class="tx"><b>${l.orden}. ${esc(l.titulo)}</b><div class="m">${TIPO_LECCION[l.tipo]}${l.duracion_min ? ` · ${l.duracion_min} min` : ''}${l.url ? ` · <a href="${esc(l.url)}" target="_blank" rel="noopener">abrir</a>` : ''}</div></div><button class="btn s" data-el="${l.id}">Editar</button><button class="btn s peligro" data-dl="${l.id}">Quitar</button></li>`).join('') || '<li class="vacio">Sin lecciones todavía.</li>'}</ul><div class="small muted" style="margin-top:10px">Los videos van en YouTube como «no listado» (o Vimeo) y aquí se pega la liga: no se suben a SIGAE.</div>`, `<button class="btn" data-cerrar>Cerrar</button><button class="btn p" id="le_nueva">＋ Lección</button>`);
  const reabrir = async () => { const d2 = await cargarAcademia(); lecciones(d2.cursos.find(x => x.id === c.id), d2, ctx, alCambiar); };
  document.getElementById('le_nueva').onclick = () => editarLeccion(null, c, ls.length + 1, reabrir);
  document.querySelectorAll('[data-el]').forEach(b => b.onclick = () => editarLeccion(ls.find(l => l.id === b.dataset.el), c, null, reabrir));
  document.querySelectorAll('[data-dl]').forEach(b => b.onclick = async () => { const l = ls.find(x => x.id === b.dataset.dl); if (!confirm(`¿Quitar la lección «${l.titulo}»? El avance registrado de las monitoras en esta lección también se quita.`)) return; await api.borrarLeccion(l.id); toast('Lección quitada'); reabrir(); alCambiar(); });
}
function editarLeccion(l, c, ordenSugerido, alGuardar) {
  const v = l || {};
  modal(l ? 'Editar lección' : `Nueva lección · ${esc(c.titulo)}`, `<div class="form"><div class="f"><label>Título</label><input id="le_t" value="${esc(v.titulo || '')}"></div>
    <div class="form g3"><div class="f"><label>Tipo</label><select id="le_tipo">${Object.entries(TIPO_LECCION).map(([k, t]) => `<option value="${k}" ${(v.tipo || 'video') === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div><div class="f"><label>Orden</label><input type="number" id="le_o" value="${v.orden || ordenSugerido || 1}"></div><div class="f"><label>Duración (min)</label><input type="number" id="le_min" value="${v.duracion_min || ''}"></div></div>
    <div class="f"><label>Liga del video (YouTube no listado / Vimeo) o del enlace</label><input id="le_url" value="${esc(v.url || '')}" placeholder="https://youtu.be/…"></div>
    <div class="f"><label>Texto de la lección (para tipo «Lectura»; también sirve como descripción)</label><textarea id="le_c" style="min-height:120px">${esc(v.contenido || '')}</textarea></div>
    <div class="f"><label>Documento (PDF u otro) <span class="muted">· se guarda en el bucket academia</span></label><input type="file" id="le_file" accept=".pdf,.doc,.docx,.ppt,.pptx,image/*">${v.storage_path ? '<div class="small muted">Ya hay un documento; otro lo sustituye.</div>' : ''}</div></div>`, `<button class="btn" data-cerrar>Cancelar</button><button class="btn p" id="le_ok">Guardar</button>`);
  document.getElementById('le_ok').onclick = async () => {
    if (!val('le_t')) { toast('Falta el título.'); return; }
    const f = document.getElementById('le_file').files[0]; let storage_path = v.storage_path || null;
    if (f) { if (f.size > 25 * 1024 * 1024) { toast('El archivo pasa de 25 MB.'); return; } const ext = (f.name.split('.').pop() || 'bin').toLowerCase(); storage_path = `${c.id}/${Date.now()}.${ext}`; const r = await (await import('./supabase.js')).db.storage.from('academia').upload(storage_path, f); if (r.error) { toast('No se pudo subir el archivo: ' + r.error.message); return; } }
    await api.guardarLeccion({ ...(l ? { id: l.id } : { curso_id: c.id }), titulo: val('le_t'), tipo: val('le_tipo'), orden: Number(val('le_o')) || 1, duracion_min: val('le_min') ? Number(val('le_min')) : null, url: val('le_url') || null, contenido: val('le_c') || null, storage_path });
    cerrarModal(); toast('Lección guardada'); alGuardar();
  };
}
function editarCuestionario(c, d, alGuardar) {
  const q = d.cuestionarios.find(x => x.curso_id === c.id) || null;
  modal(`Evaluación · ${esc(c.titulo)}`, `<div class="form"><div class="form g2"><div class="f"><label>Título</label><input id="q_t" value="${esc(q?.titulo || 'Evaluación del módulo')}"></div><div class="f"><label>Mínimo para aprobar (%)</label><input type="number" id="q_min" value="${q?.minimo_aprobatorio ?? 80}" min="0" max="100"></div></div>
    <div class="f"><label>Preguntas <span class="muted">· una por bloque; la primera línea es la pregunta, las siguientes las opciones; marca la correcta con * al inicio; separa preguntas con una línea en blanco</span></label><textarea id="q_p" style="min-height:220px;font-family:ui-monospace,monospace;font-size:13px" placeholder="¿Qué es una monitora educativa?\n* Una profesional que acompaña al estudiante en la escuela\nUna maestra titular\nUna terapeuta externa\n\n¿Cuándo se llena la bitácora?\nAl final de la semana\n* Cada día de acompañamiento">${esc(textoPreguntas(q?.preguntas))}</textarea></div><div class="small muted" id="q_prev"></div></div>`, `<button class="btn" data-cerrar>Cancelar</button><button class="btn p" id="q_ok">Guardar</button>`);
  const prev = () => { const ps = parsearPreguntas(val('q_p')); document.getElementById('q_prev').textContent = ps.length ? `${ps.length} pregunta${ps.length > 1 ? 's' : ''} detectada${ps.length > 1 ? 's' : ''}.` : 'Aún no hay preguntas válidas (cada una necesita al menos dos opciones).'; }; prev(); document.getElementById('q_p').oninput = prev;
  document.getElementById('q_ok').onclick = async () => { const preguntas = parsearPreguntas(val('q_p')); await api.guardarCuestionario({ ...(q ? { id: q.id } : { curso_id: c.id }), titulo: val('q_t') || 'Evaluación del módulo', minimo_aprobatorio: Number(val('q_min')) || 80, preguntas }); cerrarModal(); toast('Evaluación guardada'); alGuardar(); };
}
function verAvance({ m, av }, d) {
  modal(`Academia · ${esc(m.nombre)}`, `<div class="row" style="margin-bottom:10px"><b>${av.pctGlobal} % de avance</b><span class="small muted">· ${av.completos}/${av.total} cursos completados</span></div>${av.porCurso.map(x => `<div class="card" style="margin-bottom:10px"><div class="hd"><h3>${esc(x.curso.titulo)}</h3><div class="sp"></div>${x.completo ? '<span class="tag ok">Completado</span>' : `<span class="tag warn">${x.pct} %</span>`}</div><div class="bd sin"><ul class="lista">${x.lecciones.map(l => { const p = d.progreso.find(y => y.perfil_id === m.id && y.leccion_id === l.id); return `<li style="padding:7px 14px"><div class="tx"><b>${esc(l.titulo)}</b><div class="m">${TIPO_LECCION[l.tipo]}${p ? ` · vista el ${fecha(p.completada_en)}` : ''}</div></div>${p ? '<span class="tag ok">Vista</span>' : '<span class="tag gray">Pendiente</span>'}</li>`; }).join('')}${x.tienePreguntas ? `<li style="padding:7px 14px"><div class="tx"><b>Evaluación</b><div class="m">${x.intentos.length ? x.intentos.map(i => `${fecha(i.fecha)} ${hora(i.fecha)}: ${i.porcentaje} % (${i.aciertos}/${i.total})`).join(' · ') : 'sin intentos'}</div></div>${x.aprobado ? `<span class="tag ok">Aprobada · ${x.mejor} %</span>` : x.mejor != null ? `<span class="tag bad">No aprobada · ${x.mejor} %</span>` : '<span class="tag gray">Pendiente</span>'}</li>` : ''}</ul></div></div>`).join('') || '<div class="vacio">No hay cursos publicados.</div>'}`);
}
/** Tarjeta para el perfil de la monitora en la pestaña Monitoras. */
export async function htmlAcademiaMonitora(perfilId) {
  const d = await cargarAcademia(); const av = avanceDe({ cursos: d.cursos.filter(c => c.publicado), lecciones: d.lecciones, cuestionarios: d.cuestionarios, progreso: d.progreso, intentos: d.intentos, perfilId });
  return `<div class="row" style="margin-bottom:6px"><b>Academia SHADOW: ${av.pctGlobal} %</b><span class="small muted">· ${av.completos}/${av.total} cursos</span></div>${barra(av.pctGlobal, av.completos === av.total && av.total ? 'ok' : '')}<div class="small muted" style="margin-top:6px">${av.pendientesObligatorios.length ? `Pendientes obligatorios: ${av.pendientesObligatorios.map(x => esc(x.curso.titulo)).join(', ')}.` : 'Al día con los cursos obligatorios.'} Detalle en la pestaña Academia.</div>`;
}

/* ======================= Materiales y recursos ======================= */
export async function materiales(vista, ctx, params = {}) {
  const sec = params.sec || 'monitoras';
  const [cats, mats] = await Promise.all([api.categoriasMaterial(), api.materiales()]);
  const propuestas = mats.filter(m => m.estado === 'propuesto');
  const recargar = (s = sec) => materiales(vista, ctx, { sec: s });
  const pestañas = [['monitoras', 'Biblioteca de monitoras'], ['familias', 'Recursos para familias'], ['bandeja', `Bandeja de propuestas${propuestas.length ? ` (${propuestas.length})` : ''}`]];
  vista.innerHTML = `<div class="row"><h1 class="titulo">Materiales y recursos</h1><div class="sp"></div>${sec !== 'bandeja' ? `<button class="btn" id="maCat">＋ Categoría</button><button class="btn p" id="maNuevo">＋ Subir material</button>` : ''}</div>
  <div class="subtitulo">Dos bibliotecas: una para el equipo de monitoras y otra, con otro tono, para las familias. Lo que proponen las monitoras pasa primero por tu bandeja.</div>
  <div class="subtabs">${pestañas.map(([k, t]) => `<button class="${k === sec ? 'on' : ''}" data-sec="${k}">${t}</button>`).join('')}</div>
  <div id="maZona"></div>`;
  vista.querySelectorAll('[data-sec]').forEach(b => b.onclick = () => recargar(b.dataset.sec));
  const zona = document.getElementById('maZona');
  if (sec === 'bandeja') {
    const monis = await api.monitoras();
    zona.innerHTML = `<div class="card"><div class="bd sin"><ul class="lista">${propuestas.map(m => `<li><span class="ava" style="background:var(--amber-2);color:#8A5A00">${ICONO_MAT[m.tipo]}</span><div class="tx"><b>${esc(m.titulo)}</b><div class="m">${TIPO_MAT[m.tipo]} · propuesto por ${esc(nombreCorto(monis.find(x => x.id === m.subido_por)?.nombre || '—'))} el ${fecha(m.creado_en)}${m.categoria_id ? ' · sugiere: ' + esc(cats.find(c => c.id === m.categoria_id)?.nombre || '') : ''}${m.descripcion ? '<br>' + esc(m.descripcion) : ''}</div></div><div class="row" style="gap:6px"><button class="btn s" data-ver="${m.id}">Abrir</button><button class="btn s p" data-ok="${m.id}">Aprobar</button><button class="btn s peligro" data-no="${m.id}">No aprobar</button></div></li>`).join('') || '<li class="vacio">No hay propuestas pendientes. Cuando una monitora proponga un material, aparecerá aquí.</li>'}</ul></div></div>
    <h4 style="margin:16px 0 8px">Revisadas recientemente</h4><div class="card"><div class="bd sin"><ul class="lista">${mats.filter(m => ['rechazado'].includes(m.estado) || (m.estado === 'aprobado' && m.aprobado_por && m.subido_por && m.aprobado_por !== m.subido_por)).slice(0, 10).map(m => `<li><div class="tx"><b>${esc(m.titulo)}</b><div class="m">${esc(nombreCorto(monis.find(x => x.id === m.subido_por)?.nombre || '—'))} · ${m.nota_revision ? esc(m.nota_revision) : ''}</div></div>${tagMat(m.estado)}</li>`).join('') || '<li class="vacio">Nada todavía.</li>'}</ul></div></div>`;
    zona.querySelectorAll('[data-ver]').forEach(b => b.onclick = () => abrirMaterial(mats.find(m => m.id === b.dataset.ver)));
    zona.querySelectorAll('[data-ok]').forEach(b => b.onclick = () => { const m = mats.find(x => x.id === b.dataset.ok); const cs = cats.filter(c => c.audiencia === 'monitoras' && c.activo); modal('Aprobar material', `<div class="form"><div class="f"><label>Carpeta donde se guarda</label><select id="ap_cat"><option value="">— Sin categoría —</option>${cs.map(c => `<option value="${c.id}" ${m.categoria_id === c.id ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}</select></div><div class="f"><label>Nota para la monitora (opcional)</label><input id="ap_n" placeholder="Gracias, quedó en Guías de intervención"></div></div>`, `<button class="btn" data-cerrar>Cancelar</button><button class="btn p" id="ap_ok">Aprobar y publicar</button>`); document.getElementById('ap_ok').onclick = async () => { await api.guardarMaterial({ id: m.id, estado: 'aprobado', categoria_id: val('ap_cat') || null, aprobado_por: ctx.perfil.id, aprobado_en: new Date().toISOString(), nota_revision: val('ap_n') || null }); cerrarModal(); toast('Material aprobado'); recargar('bandeja'); }; });
    zona.querySelectorAll('[data-no]').forEach(b => b.onclick = () => { const m = mats.find(x => x.id === b.dataset.no); modal('No aprobar', `<div class="f"><label>Motivo para la monitora</label><textarea id="no_n" placeholder="Ej. El documento no tiene autorización de distribución."></textarea></div>`, `<button class="btn" data-cerrar>Cancelar</button><button class="btn p" id="no_ok">Guardar</button>`); document.getElementById('no_ok').onclick = async () => { if (!val('no_n')) { toast('Escribe el motivo.'); return; } await api.guardarMaterial({ id: m.id, estado: 'rechazado', aprobado_por: ctx.perfil.id, aprobado_en: new Date().toISOString(), nota_revision: val('no_n') }); cerrarModal(); toast('Registrado'); recargar('bandeja'); }; });
    return;
  }
  const cs = cats.filter(c => c.audiencia === sec).sort((a, b) => a.orden - b.orden); const ms = mats.filter(m => m.audiencia === sec && ['aprobado', 'retirado'].includes(m.estado));
  const grupos = [...cs, { id: null, nombre: 'Sin categoría', activo: true }];
  zona.innerHTML = `<div class="row" style="margin-bottom:12px;gap:6px">${cs.map(c => `<button class="btn s ${c.activo ? '' : 'ghost'}" data-cat="${c.id}" title="Editar categoría">${esc(c.nombre)}${c.activo ? '' : ' (oculta)'} <span class="muted">${ms.filter(m => m.categoria_id === c.id && m.estado === 'aprobado').length}</span></button>`).join('') || '<span class="small muted">Sin categorías aún. Crea la primera con «＋ Categoría».</span>'}</div>
    ${grupos.map(c => { const lista = ms.filter(m => (m.categoria_id || null) === c.id); if (!lista.length) return ''; return `<div class="card" style="margin-bottom:12px"><div class="hd"><h3>${esc(c.nombre)}</h3><span class="small muted">${lista.filter(m => m.estado === 'aprobado').length} visibles</span></div><div class="bd sin"><ul class="lista">${lista.map(m => `<li><span class="ava" style="background:var(--sky);color:var(--navy)">${ICONO_MAT[m.tipo]}</span><div class="tx"><b>${esc(m.titulo)}</b><div class="m">${TIPO_MAT[m.tipo]} · ${fecha(m.creado_en)}${m.descripcion ? ' · ' + esc(m.descripcion.slice(0, 80)) : ''}</div></div>${m.estado === 'retirado' ? tagMat('retirado') : ''}<div class="row" style="gap:6px"><button class="btn s" data-ver="${m.id}">Abrir</button><button class="btn s" data-ed="${m.id}">Editar</button><button class="btn s ${m.estado === 'retirado' ? '' : 'peligro'}" data-ret="${m.id}">${m.estado === 'retirado' ? 'Reactivar' : 'Retirar'}</button></div></li>`).join('')}</ul></div></div>`; }).join('') || `<div class="card"><div class="vacio">${sec === 'familias' ? 'Aún no hay recursos para familias. Sube el primero: una guía, un video o una liga.' : 'Aún no hay materiales en la biblioteca.'}</div></div>`}`;
  document.getElementById('maNuevo').onclick = () => formMaterial({ audiencia: sec, categorias: cs, perfilId: ctx.perfil.id, alGuardar: () => recargar() });
  document.getElementById('maCat').onclick = () => editarCategoria(null, sec, cs.length + 1, () => recargar());
  zona.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => editarCategoria(cs.find(c => c.id === b.dataset.cat), sec, null, () => recargar()));
  zona.querySelectorAll('[data-ver]').forEach(b => b.onclick = () => abrirMaterial(ms.find(m => m.id === b.dataset.ver)));
  zona.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => formMaterial({ audiencia: sec, categorias: cs, perfilId: ctx.perfil.id, material: ms.find(m => m.id === b.dataset.ed), alGuardar: () => recargar() }));
  zona.querySelectorAll('[data-ret]').forEach(b => b.onclick = async () => { const m = ms.find(x => x.id === b.dataset.ret); await api.guardarMaterial({ id: m.id, estado: m.estado === 'retirado' ? 'aprobado' : 'retirado' }); toast(m.estado === 'retirado' ? 'Material visible de nuevo' : 'Material retirado (no se borra)'); recargar(); });
}
function editarCategoria(c, audiencia, ordenSugerido, alGuardar) {
  const v = c || {};
  modal(c ? 'Editar categoría' : 'Nueva categoría', `<div class="form"><div class="f"><label>Nombre</label><input id="ca_n" value="${esc(v.nombre || '')}" placeholder="${audiencia === 'familias' ? 'Ej. Autorregulación y corregulación' : 'Ej. Guías de intervención'}"></div><div class="form g2"><div class="f"><label>Orden</label><input type="number" id="ca_o" value="${v.orden || ordenSugerido || 1}"></div><label class="chk" style="align-self:end"><input type="checkbox" id="ca_a" ${v.activo !== false ? 'checked' : ''}> Visible</label></div><div class="small muted">Ocultar una categoría no borra sus materiales; dejan de verse hasta que la vuelvas a mostrar o los muevas.</div></div>`, `<button class="btn" data-cerrar>Cancelar</button><button class="btn p" id="ca_ok">Guardar</button>`);
  document.getElementById('ca_ok').onclick = async () => { if (!val('ca_n')) { toast('Falta el nombre.'); return; } await api.guardarCategoria({ ...(c ? { id: c.id } : { audiencia }), nombre: val('ca_n'), orden: Number(val('ca_o')) || 1, activo: val('ca_a') }); cerrarModal(); toast('Categoría guardada'); alGuardar(); };
}
