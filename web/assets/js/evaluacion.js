/* SIGAE — evaluaciones (diagnóstica, intermedia, final), objetivos del ciclo y comparativo.
   Compartido por Dirección, monitora, familia y los PDF. Muestra cambios; no concluye «mejoró» o «empeoró»: eso lo lee Dirección. */
import { esc, fecha } from './ui.js';

export const TIPOS = { diagnostica: 'Diagnóstica', intermedia: 'Intermedia', final: 'Final' };
export const ORDEN = ['diagnostica', 'intermedia', 'final'];
/** Escala 1–5 por dimensión (supuesto #8 de docs/02): nivel de apoyo que necesita el estudiante. */
export const ESCALA = [[1, 'Con apoyo constante'], [2, 'Con apoyo frecuente'], [3, 'Con apoyo ocasional'], [4, 'Casi sin apoyo'], [5, 'De forma autónoma']];
export const ESTADO_OBJ = { en_proceso: 'En proceso', alcanzado: 'Alcanzado', pausado: 'Pausado' };
export const AVANCE_OBJ = { avance: 'Con avance', sin_cambio: 'Sin cambio', alcanzado: 'Alcanzado', atencion: 'Requiere atención' };
export const PRIORIDAD = { 1: 'Alta', 2: 'Normal', 3: 'Baja' };

/** resultados = { dimensiones: { clave: 1..5 }, objetivos: { objetivoId: { estado, nota } } }. Acepta el formato plano antiguo. */
export const dimsDe = ev => { const r = ev?.resultados || {}; if (r.dimensiones) return r.dimensiones; const o = {}; Object.entries(r).forEach(([k, v]) => { if (typeof v === 'number') o[k] = v; }); return o; };
export const objsDe = ev => ev?.resultados?.objetivos || {};
export const ultimaDe = (evals, tipo) => evals.filter(e => e.tipo === tipo).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))[0];
export const tagEval = (ev, hoy) => !ev ? '<span class="tag gray">Sin programar</span>' : ev.realizada ? `<span class="tag ok">Aplicada · ${fecha(ev.fecha)}</span>` : ev.fecha ? (ev.fecha < hoy ? `<span class="tag bad">Vencida · ${fecha(ev.fecha)}</span>` : `<span class="tag warn">Programada · ${fecha(ev.fecha)}</span>`) : '<span class="tag warn">Por programar</span>';

/** Comparativo del ciclo: una fila por dimensión con su valor en cada evaluación aplicada (en orden D → I → F) y una por objetivo. */
export function comparativo({ evals, objetivos, dimensiones }) {
  const hechas = ORDEN.map(t => ultimaDe(evals.filter(e => e.realizada), t)).filter(Boolean);
  const filas = dimensiones.map(d => { const vals = hechas.map(ev => dimsDe(ev)[d.clave] ?? null); const ini = vals.find(v => v != null) ?? null; const fin = [...vals].reverse().find(v => v != null) ?? null; return { clave: d.clave, etiqueta: d.etiqueta, vals, ini, fin, delta: ini != null && fin != null && hechas.length > 1 ? fin - ini : null }; });
  const conDelta = filas.filter(f => f.delta != null);
  const promedioDelta = conDelta.length ? +(conDelta.reduce((a, f) => a + f.delta, 0) / conDelta.length).toFixed(1) : null;
  const necesidades = filas.filter(f => f.fin != null && f.fin <= 2);
  const objs = objetivos.map(o => ({ ...o, porEval: hechas.map(ev => objsDe(ev)[o.id] || null) }));
  return { hechas, primera: hechas[0] || null, ultima: hechas[hechas.length - 1] || null, filas, promedioDelta, necesidades, objs, alcanzados: objetivos.filter(o => o.estado === 'alcanzado').length, total: objetivos.length };
}

export const nivelHtml = v => `<span class="nivel" title="${v ?? '—'} de 5">${[1, 2, 3, 4, 5].map(i => `<i class="${v != null && i <= v ? 'on' : ''}"></i>`).join('')}<b>${v ?? '—'}</b></span>`;
export const deltaHtml = d => d == null ? '' : d > 0 ? `<span class="delta up">▲ +${d}</span>` : d < 0 ? `<span class="delta down">▼ ${d}</span>` : '<span class="delta eq">= sin cambio</span>';
const tagAvance = x => `<span class="tag ${x.estado === 'alcanzado' ? 'ok' : x.estado === 'atencion' ? 'bad' : x.estado === 'avance' ? '' : 'gray'}">${AVANCE_OBJ[x.estado] || esc(x.estado)}</span>`;

/** Tabla comparativa. `observaciones:false` oculta las observaciones profesionales y las notas por objetivo (vista de la familia). */
export function htmlComparativo(cmp, { compacto = false, observaciones = true } = {}) {
  if (!cmp.hechas.length) return '<div class="vacio">Aún no hay evaluaciones aplicadas en este ciclo.</div>';
  const varias = cmp.hechas.length > 1;
  const cab = cmp.hechas.map(ev => `<th>${TIPOS[ev.tipo]}<div class="small muted" style="font-weight:500">${fecha(ev.fecha)}</div></th>`).join('');
  const filas = cmp.filas.filter(f => f.vals.some(v => v != null)).map(f => `<tr><td>${esc(f.etiqueta)}</td>${f.vals.map(v => `<td>${nivelHtml(v)}</td>`).join('')}${varias ? `<td>${deltaHtml(f.delta)}</td>` : ''}</tr>`).join('');
  const hayObj = cmp.objs.length && cmp.hechas.some(ev => Object.keys(objsDe(ev)).length);
  const objs = hayObj ? `<tr class="sep"><td colspan="${cmp.hechas.length + (varias ? 2 : 1)}"><b>Objetivos del ciclo</b></td></tr>` + cmp.objs.map(o => `<tr><td>${esc(o.descripcion)}</td>${o.porEval.map(x => `<td>${x ? tagAvance(x) + (x.nota && observaciones ? `<div class="small muted">${esc(x.nota)}</div>` : '') : '<span class="muted">—</span>'}</td>`).join('')}${varias ? `<td><span class="tag ${o.estado === 'alcanzado' ? 'ok' : 'gray'}">${ESTADO_OBJ[o.estado]}</span></td>` : ''}</tr>`).join('') : '';
  const obs = observaciones ? cmp.hechas.filter(ev => ev.observaciones).map(ev => `<div class="small" style="margin-top:6px"><b>${TIPOS[ev.tipo]} (${fecha(ev.fecha)}):</b> ${esc(ev.observaciones)}</div>`).join('') : '';
  const escala = compacto ? '' : `<div class="leyenda" style="margin-top:8px">${ESCALA.map(([n, t]) => `<span><b>${n}</b> ${t}</span>`).join('')}</div>`;
  const nec = cmp.necesidades.length && !compacto ? `<div class="alerta warn" style="margin-top:10px"><span class="tx small"><b>Necesidades que siguen presentes</b> (nivel 1 o 2 en la última evaluación): ${cmp.necesidades.map(n => esc(n.etiqueta)).join(', ')}.</span></div>` : '';
  return `<div class="tabla-wrap"><table class="cmp"><thead><tr><th>Dimensión</th>${cab}${varias ? '<th>Cambio</th>' : ''}</tr></thead><tbody>${filas}${objs}</tbody></table></div>${escala}${obs}${nec}`;
}

export function htmlObjetivos(objetivos, { editable = false, prefijo = 'ob' } = {}) {
  return `<ul class="lista">${objetivos.map(o => `<li ${editable ? `class="click" data-${prefijo}="${o.id}"` : ''} style="padding:8px 14px"><div class="tx"><b>${esc(o.descripcion)}</b><div class="m">${esc(o.estrategia || '')}${o.prioridad === 1 ? ' · <span class="tag warn">Prioridad alta</span>' : ''}${editable ? `<span class="muted"> · ${o.visible_familia ? 'la familia lo ve' : 'solo equipo'}${o.visible_monitora ? '' : ' · oculto a la monitora'}</span>` : ''}</div></div><span class="tag ${o.estado === 'alcanzado' ? 'ok' : o.estado === 'pausado' ? 'gray' : ''}">${ESTADO_OBJ[o.estado]}</span></li>`).join('') || '<li class="vacio">Sin objetivos en este ciclo.</li>'}</ul>`;
}
