/* SIGAE — Academia SHADOW: cálculo de avance y piezas compartidas (Dirección y monitora). */
import { esc, fecha, hora } from './ui.js';

export const TIPO_LECCION = { video: 'Video', documento: 'Documento', enlace: 'Enlace', texto: 'Lectura' };
export const ICONO_LECCION = { video: '▶', documento: '▤', enlace: '↗', texto: '≡' };

/** Convierte una liga de YouTube (normal, corta, no listada) o Vimeo en la URL para incrustar. Devuelve null si no es video reconocido. */
export function urlIncrustar(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/); if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0`;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/); if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}
export function htmlVideo(url) {
  const src = urlIncrustar(url);
  return src ? `<div class="video-wrap"><iframe src="${esc(src)}" title="Video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>` : `<div class="alerta warn"><span class="tx small">La liga del video no es de YouTube ni Vimeo. <a href="${esc(url)}" target="_blank" rel="noopener">Abrir en otra pestaña</a>.</span></div>`;
}

/** Avance de una persona en todos los cursos. */
export function avanceDe({ cursos, lecciones, cuestionarios, progreso, intentos, perfilId }) {
  const mios = progreso.filter(p => p.perfil_id === perfilId), misInt = intentos.filter(i => i.perfil_id === perfilId);
  const porCurso = cursos.map(c => {
    const ls = lecciones.filter(l => l.curso_id === c.id).sort((a, b) => a.orden - b.orden);
    const hechas = ls.filter(l => mios.some(p => p.leccion_id === l.id));
    const q = cuestionarios.find(x => x.curso_id === c.id) || null;
    const ints = q ? misInt.filter(i => i.cuestionario_id === q.id).sort((a, b) => b.fecha.localeCompare(a.fecha)) : [];
    const mejor = ints.length ? Math.max(...ints.map(i => i.porcentaje)) : null;
    const aprobado = q ? ints.some(i => i.aprobado) : true;
    const tienePreguntas = !!(q && (q.preguntas || []).length);
    const completo = ls.length > 0 && hechas.length === ls.length && (!tienePreguntas || aprobado);
    const pct = ls.length || tienePreguntas ? Math.round(100 * (hechas.length + (tienePreguntas && aprobado ? 1 : 0)) / (ls.length + (tienePreguntas ? 1 : 0))) : 0;
    return { curso: c, lecciones: ls, hechas, pendientes: ls.filter(l => !hechas.includes(l)), cuestionario: q, tienePreguntas, intentos: ints, mejor, aprobado, completo, pct, ultimoIntento: ints[0] || null };
  });
  const total = porCurso.length, completos = porCurso.filter(x => x.completo).length;
  const pctGlobal = total ? Math.round(porCurso.reduce((a, x) => a + x.pct, 0) / total) : 0;
  const pendientesObligatorios = porCurso.filter(x => x.curso.obligatorio && !x.completo);
  return { porCurso, total, completos, pctGlobal, pendientesObligatorios };
}

export const barra = (pct, clase = '') => `<div class="prog ${clase}"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>`;
export const tagCurso = x => x.completo ? '<span class="tag ok">Completado</span>' : x.pct ? `<span class="tag warn">${x.pct} %</span>` : '<span class="tag gray">Sin iniciar</span>';

/** Lista de cursos con avance (vista de la monitora o detalle de una monitora en Dirección). */
export function htmlCursos(av, { clickable = true } = {}) {
  return `<ul class="lista">${av.porCurso.map(x => `<li ${clickable ? `class="click" data-curso="${x.curso.id}"` : ''}><div class="tx"><b>${esc(x.curso.titulo)}${x.curso.obligatorio ? ' <span class="tag conf" style="font-size:10.5px">Obligatorio</span>' : ''}</b><div class="m">${x.hechas.length}/${x.lecciones.length} lecciones${x.tienePreguntas ? ` · evaluación: ${x.mejor == null ? 'pendiente' : `${x.mejor} %${x.aprobado ? ' ✓' : ' (mín. ' + x.cuestionario.minimo_aprobatorio + ' %)'}`}` : ''}</div>${barra(x.pct, x.completo ? 'ok' : '')}</div>${tagCurso(x)}</li>`).join('') || '<li class="vacio">Aún no hay cursos publicados.</li>'}</ul>`;
}

/** Arma preguntas desde texto pegable: una pregunta por bloque; primera línea = pregunta; siguientes = opciones; la correcta empieza con *. Bloques separados por línea en blanco. */
export function parsearPreguntas(texto) {
  return texto.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean).map(b => {
    const [p, ...ops] = b.split('\n').map(x => x.trim()).filter(Boolean);
    const opciones = ops.map(o => o.replace(/^\*\s*/, '')); const correcta = ops.findIndex(o => o.startsWith('*'));
    return { texto: p, opciones, correcta: correcta < 0 ? 0 : correcta };
  }).filter(q => q.texto && q.opciones.length >= 2);
}
export const textoPreguntas = preguntas => (preguntas || []).map(q => [q.texto, ...q.opciones.map((o, i) => (i === q.correcta ? '* ' : '') + o)].join('\n')).join('\n\n');
