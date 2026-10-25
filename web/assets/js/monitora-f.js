/* SIGAE — Monitora, paso F: Academia SHADOW (cursar, responder, ver avance) y biblioteca de materiales (consultar, proponer). */
import * as api from './api.js';
import { esc, fecha, hora, toast, modal, cerrarModal, val } from './ui.js';
import { TIPO_LECCION, ICONO_LECCION, avanceDe, barra, htmlCursos, htmlVideo } from './academia.js';
import { htmlBiblioteca, engancharBiblioteca, formMaterial, tagMat, abrirMaterial, TIPO_MAT, ICONO_MAT } from './materiales.js';

async function cargar(perfilId) {
  const [cursos, lecciones, cuestionarios, progreso, intentos] = await Promise.all([api.cursos({ soloPublicados: true }), api.lecciones(), api.cuestionarios(), api.progreso(perfilId), api.intentos(perfilId)]);
  return { cursos, lecciones, cuestionarios, progreso, intentos, av: avanceDe({ cursos, lecciones, cuestionarios, progreso, intentos, perfilId }) };
}

/** Contenido de la tarjeta «Academia SHADOW» del inicio. */
export async function htmlAvanceInicio(perfilId) {
  const d = await cargar(perfilId); const av = d.av;
  const pend = av.porCurso.filter(x => !x.completo);
  return `<div class="row" style="margin-bottom:6px"><b style="font-size:22px">${av.pctGlobal} %</b><span class="small muted">${av.completos}/${av.total} cursos completados</span></div>${barra(av.pctGlobal, av.completos === av.total && av.total ? 'ok' : '')}<div class="small" style="margin-top:8px">${pend.length ? `<b>Te falta:</b> ${pend.slice(0, 3).map(x => esc(x.curso.titulo) + (x.curso.obligatorio ? ' <span class="tag conf" style="font-size:10px">obligatorio</span>' : '') + (x.tienePreguntas && x.hechas.length === x.lecciones.length && !x.aprobado ? ' (solo la evaluación)' : '')).join(' · ')}${pend.length > 3 ? ` y ${pend.length - 3} más` : ''}.` : av.total ? '¡Estás al día con la Academia! 🎉' : 'Dirección aún no publica cursos.'}</div><button class="btn s" data-ir="academia" style="margin-top:8px">Ir a la Academia</button>`;
}

export async function academia(vista, ctx, params = {}) {
  const d = await cargar(ctx.perfil.id);
  if (params.curso) return curso(vista, ctx, d, params.curso);
  vista.innerHTML = `<h1 class="titulo">Academia SHADOW</h1><div class="subtitulo">Tu formación como monitora: inducción, acompañamiento y temas afines. Avanza a tu ritmo y retoma donde te quedaste.</div>
  <div class="card" style="margin-bottom:12px"><div class="bd"><div class="row"><div><div class="small muted">Tu avance general</div><div style="font-size:30px;font-weight:800;line-height:1.1">${d.av.pctGlobal} %</div></div><div class="sp"></div><div class="small muted" style="text-align:right">${d.av.completos} de ${d.av.total} cursos completados${d.av.pendientesObligatorios.length ? `<br><span style="color:var(--red)">${d.av.pendientesObligatorios.length} obligatorio${d.av.pendientesObligatorios.length > 1 ? 's' : ''} pendiente${d.av.pendientesObligatorios.length > 1 ? 's' : ''}</span>` : ''}</div></div>${barra(d.av.pctGlobal, d.av.completos === d.av.total && d.av.total ? 'ok' : '')}</div></div>
  <div class="card"><div class="bd sin">${htmlCursos(d.av)}</div></div>`;
  vista.querySelectorAll('[data-curso]').forEach(li => li.onclick = () => curso(vista, ctx, d, li.dataset.curso));
}

function curso(vista, ctx, d, cursoId) {
  const x = d.av.porCurso.find(y => y.curso.id === cursoId); if (!x) return academia(vista, ctx);
  const recargar = async () => { const d2 = await cargar(ctx.perfil.id); curso(vista, ctx, d2, cursoId); };
  vista.innerHTML = `<div class="row"><button class="btn s" id="acVolver">‹ Academia</button></div><h1 class="titulo" style="margin-top:8px">${esc(x.curso.titulo)}</h1><div class="subtitulo">${esc(x.curso.descripcion || '')}</div>
  <div class="card" style="margin-bottom:12px"><div class="bd">${barra(x.pct, x.completo ? 'ok' : '')}<div class="small muted" style="margin-top:6px">${x.hechas.length} de ${x.lecciones.length} lecciones vistas${x.tienePreguntas ? ` · evaluación ${x.aprobado ? 'aprobada' : x.mejor != null ? `pendiente (tu mejor intento: ${x.mejor} %, mínimo ${x.cuestionario.minimo_aprobatorio} %)` : 'pendiente'}` : ''}</div></div></div>
  <div class="card" style="margin-bottom:12px"><div class="hd"><h3>Lecciones</h3></div><div class="bd sin"><ul class="lista">${x.lecciones.map(l => { const vista_ = x.hechas.includes(l); return `<li class="click" data-lec="${l.id}"><span class="ava" style="background:${vista_ ? 'var(--green-2)' : 'var(--sky)'};color:${vista_ ? 'var(--green)' : 'var(--navy)'}">${vista_ ? '✓' : ICONO_LECCION[l.tipo]}</span><div class="tx"><b>${l.orden}. ${esc(l.titulo)}</b><div class="m">${TIPO_LECCION[l.tipo]}${l.duracion_min ? ` · ${l.duracion_min} min` : ''}</div></div>${vista_ ? '<span class="tag ok">Vista</span>' : '<span class="btn s">Abrir</span>'}</li>`; }).join('') || '<li class="vacio">Este curso aún no tiene lecciones.</li>'}</ul></div></div>
  ${x.tienePreguntas ? `<div class="card"><div class="hd"><h3>${esc(x.cuestionario.titulo)}</h3><div class="sp"></div>${x.aprobado ? `<span class="tag ok">Aprobada · ${x.mejor} %</span>` : x.mejor != null ? `<span class="tag bad">${x.mejor} % · mínimo ${x.cuestionario.minimo_aprobatorio} %</span>` : '<span class="tag gray">Pendiente</span>'}</div><div class="bd"><p class="small muted">${x.cuestionario.preguntas.length} preguntas. ${x.hechas.length < x.lecciones.length ? 'Te recomendamos ver todas las lecciones antes de responder.' : 'Puedes responder las veces que necesites; cuenta tu mejor resultado.'}</p><button class="btn p" id="acResponder">${x.intentos.length ? 'Volver a responder' : 'Responder la evaluación'}</button>${x.intentos.length ? `<div class="small muted" style="margin-top:10px"><b>Tus intentos:</b> ${x.intentos.map(i => `${fecha(i.fecha)} ${hora(i.fecha)} · ${i.porcentaje} % (${i.aciertos}/${i.total})`).join(' · ')}</div>` : ''}</div></div>` : ''}`;
  document.getElementById('acVolver').onclick = () => academia(vista, ctx);
  vista.querySelectorAll('[data-lec]').forEach(li => li.onclick = () => abrirLeccion(x.lecciones.find(l => l.id === li.dataset.lec), x, ctx, recargar));
  document.getElementById('acResponder')?.addEventListener('click', () => responder(x, ctx, recargar));
}

async function abrirLeccion(l, x, ctx, alCambiar) {
  let cuerpo = '';
  if (l.tipo === 'video') cuerpo = htmlVideo(l.url) + (l.contenido ? `<p class="small" style="margin-top:10px">${esc(l.contenido)}</p>` : '');
  else if (l.tipo === 'texto') cuerpo = `<div class="lectura-texto">${esc(l.contenido || '').replace(/\n/g, '<br>')}</div>`;
  else if (l.tipo === 'documento') { const href = l.storage_path ? (await (await import('./supabase.js')).db.storage.from('academia').createSignedUrl(l.storage_path, 3600)).data?.signedUrl : l.url; cuerpo = (l.contenido ? `<p class="small">${esc(l.contenido)}</p>` : '') + (href ? `<a class="btn p" href="${esc(href)}" target="_blank" rel="noopener">Abrir o descargar el documento</a>` : '<div class="alerta warn"><span class="tx small">Esta lección no tiene archivo.</span></div>'); }
  else cuerpo = (l.contenido ? `<p class="small">${esc(l.contenido)}</p>` : '') + (l.url ? `<a class="btn p" href="${esc(l.url)}" target="_blank" rel="noopener">Abrir el enlace</a>` : '');
  const vista_ = x.hechas.includes(l);
  modal(`${l.orden}. ${esc(l.titulo)}`, cuerpo, `<button class="btn" data-cerrar>Cerrar</button>${vista_ ? '<span class="tag ok" style="align-self:center">Ya la marcaste como vista</span>' : '<button class="btn p" id="lecVista">Marcar como vista</button>'}`);
  document.getElementById('lecVista')?.addEventListener('click', async () => { await api.marcarLeccion(ctx.perfil.id, l.id); cerrarModal(); toast('Lección marcada como vista'); alCambiar(); });
}

function responder(x, ctx, alGuardar) {
  const q = x.cuestionario; const ps = q.preguntas;
  modal(esc(q.titulo), `<div class="quiz">${ps.map((p, i) => `<div class="q"><div class="b">${i + 1}. ${esc(p.texto)}</div>${p.opciones.map((o, j) => `<label class="op"><input type="radio" name="q${i}" value="${j}"> <span>${esc(o)}</span></label>`).join('')}</div>`).join('')}</div>`, `<button class="btn" data-cerrar>Cancelar</button><button class="btn p" id="qzOk">Enviar respuestas</button>`);
  document.getElementById('qzOk').onclick = async () => {
    const respuestas = ps.map((_, i) => { const r = document.querySelector(`input[name="q${i}"]:checked`); return r ? Number(r.value) : null; });
    if (respuestas.some(r => r == null)) { toast('Faltan preguntas por contestar.'); return; }
    const aciertos = respuestas.filter((r, i) => r === ps[i].correcta).length; const porcentaje = Math.round(100 * aciertos / ps.length); const aprobado = porcentaje >= q.minimo_aprobatorio;
    await api.registrarIntento({ perfil_id: ctx.perfil.id, cuestionario_id: q.id, respuestas, aciertos, total: ps.length, porcentaje, aprobado, fecha: new Date().toISOString() });
    modal('Resultado', `<div style="text-align:center;padding:10px 0"><div style="font-size:44px;font-weight:800">${porcentaje} %</div><div class="small muted">${aciertos} de ${ps.length} correctas · mínimo ${q.minimo_aprobatorio} %</div><div style="margin-top:10px">${aprobado ? '<span class="tag ok">Aprobada 🎉</span>' : '<span class="tag bad">Aún no</span>'}</div></div>${aprobado ? '' : '<p class="small muted" style="text-align:center">Repasa las lecciones y vuelve a intentarlo cuando quieras.</p>'}<div class="quiz small" style="margin-top:10px">${ps.map((p, i) => `<div class="q ${respuestas[i] === p.correcta ? 'ok' : 'mal'}"><div class="b">${i + 1}. ${esc(p.texto)}</div><div>Tu respuesta: ${esc(p.opciones[respuestas[i]])}${respuestas[i] === p.correcta ? ' ✓' : ` · Correcta: ${esc(p.opciones[p.correcta])}`}</div></div>`).join('')}</div>`, `<button class="btn p" data-cerrar>Cerrar</button>`);
    document.querySelector('#modal [data-cerrar]').addEventListener('click', alGuardar, { once: true });
  };
}

/* ---------- Materiales ---------- */
export async function materiales(vista, ctx) {
  const [cats, mats, mias] = await Promise.all([api.categoriasMaterial('monitoras'), api.materiales({ audiencia: 'monitoras', estado: 'aprobado' }), api.materiales({ subidoPor: ctx.perfil.id })]);
  vista.innerHTML = `<div class="row"><h1 class="titulo">Materiales</h1><div class="sp"></div><button class="btn p" id="maProponer">Proponer material</button></div><div class="subtitulo">Guías, apoyos visuales, formatos y lecturas aprobados por Dirección. Si tienes algo útil, propónlo: pasa por revisión antes de publicarse.</div>
  <div id="maBib">${htmlBiblioteca(cats, mats, { vacio: 'Dirección aún no ha subido materiales.' })}</div>
  ${mias.length ? `<h4 style="margin:16px 0 8px">Mis propuestas</h4><div class="card"><div class="bd sin"><ul class="lista">${mias.map(m => `<li class="click" data-mia="${m.id}"><span class="ava" style="background:var(--sky);color:var(--navy)">${ICONO_MAT[m.tipo]}</span><div class="tx"><b>${esc(m.titulo)}</b><div class="m">${TIPO_MAT[m.tipo]} · ${fecha(m.creado_en)}${m.nota_revision ? ' · Dirección: ' + esc(m.nota_revision) : ''}</div></div>${tagMat(m.estado)}</li>`).join('')}</ul></div></div>` : ''}`;
  engancharBiblioteca(document.getElementById('maBib'), mats);
  vista.querySelectorAll('[data-mia]').forEach(li => li.onclick = () => abrirMaterial(mias.find(m => m.id === li.dataset.mia)));
  document.getElementById('maProponer').onclick = () => formMaterial({ audiencia: 'monitoras', categorias: cats, perfilId: ctx.perfil.id, propuesta: true, alGuardar: () => materiales(vista, ctx) });
}
