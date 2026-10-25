/* SIGAE — biblioteca de materiales (monitoras) y recursos para familias: piezas compartidas. */
import * as api from './api.js';
import { esc, fecha, toast, modal, cerrarModal, val, nombreCorto } from './ui.js';
import { htmlVideo } from './academia.js';

export const TIPO_MAT = { documento: 'Documento', video: 'Video', enlace: 'Enlace', imagen: 'Imagen' };
export const ICONO_MAT = { documento: '▤', video: '▶', enlace: '↗', imagen: '▣' };
export const ESTADO_MAT = { propuesto: 'Propuesto', aprobado: 'Aprobado', rechazado: 'No aprobado', retirado: 'Retirado' };
export const tagMat = e => ({ propuesto: '<span class="tag warn">En revisión</span>', aprobado: '<span class="tag ok">Aprobado</span>', rechazado: '<span class="tag bad">No aprobado</span>', retirado: '<span class="tag gray">Retirado</span>' }[e] || '');

/** Abre un material: video incrustado, imagen, documento (URL firmada) o enlace. */
export async function abrirMaterial(m) {
  let cuerpo = m.descripcion ? `<p class="small muted">${esc(m.descripcion)}</p>` : '';
  if (m.tipo === 'video' && m.url) cuerpo += htmlVideo(m.url);
  else {
    const href = m.storage_path ? await api.urlMaterial(m.storage_path) : m.url;
    if (!href) cuerpo += '<div class="alerta warn"><span class="tx small">Este material no tiene archivo ni liga.</span></div>';
    else if (m.tipo === 'imagen') cuerpo += `<img src="${esc(href)}" alt="${esc(m.titulo)}" style="max-width:100%;border-radius:10px;border:1px solid var(--line)">`;
    else cuerpo += `<a class="btn p" href="${esc(href)}" target="_blank" rel="noopener" download>${m.tipo === 'documento' ? 'Abrir o descargar el documento' : 'Abrir la liga'}</a>`;
  }
  modal(esc(m.titulo), cuerpo);
}

/** Biblioteca por categorías para quien consulta (monitora o familia). */
export function htmlBiblioteca(categorias, materiales, { vacio = 'Aún no hay materiales en esta sección.' } = {}) {
  const aprobados = materiales.filter(m => m.estado === 'aprobado');
  const cats = [...categorias.filter(c => c.activo).sort((a, b) => a.orden - b.orden), { id: null, nombre: 'Sin categoría' }];
  const bloques = cats.map(c => { const ms = aprobados.filter(m => (m.categoria_id || null) === c.id); if (!ms.length) return ''; return `<div class="card" style="margin-bottom:12px"><div class="hd"><h3>${esc(c.nombre)}</h3><span class="small muted">${ms.length}</span></div><div class="bd sin"><ul class="lista">${ms.map(m => `<li class="click" data-mat="${m.id}"><span class="ava" style="background:var(--sky);color:var(--navy)">${ICONO_MAT[m.tipo] || '▤'}</span><div class="tx"><b>${esc(m.titulo)}</b><div class="m">${TIPO_MAT[m.tipo] || ''}${m.descripcion ? ' · ' + esc(m.descripcion.slice(0, 90)) : ''}</div></div><span class="btn s">Abrir</span></li>`).join('')}</ul></div></div>`; }).join('');
  return bloques || `<div class="vacio">${vacio}</div>`;
}
export function engancharBiblioteca(root, materiales) { root.querySelectorAll('[data-mat]').forEach(li => li.onclick = () => abrirMaterial(materiales.find(m => m.id === li.dataset.mat))); }

/** Formulario para subir (Dirección) o proponer (monitora) un material. */
export function formMaterial({ audiencia, categorias, perfilId, propuesta = false, material = null, alGuardar }) {
  const v = material || {};
  modal(propuesta ? 'Proponer un material' : material ? 'Editar material' : `Subir material · ${audiencia === 'familias' ? 'Recursos para familias' : 'Biblioteca de monitoras'}`, `<div class="form">
    ${propuesta ? '<div class="alerta"><span class="tx small">Tu propuesta le llega a Dirección como pendiente. Si la aprueba, aparece en la biblioteca para todas.</span></div>' : ''}
    <div class="f"><label>Título</label><input id="fm_t" value="${esc(v.titulo || '')}" placeholder="Ej. Guía de apoyos visuales para transiciones"></div>
    <div class="f"><label>Descripción breve</label><textarea id="fm_d">${esc(v.descripcion || '')}</textarea></div>
    <div class="form g2"><div class="f"><label>Tipo</label><select id="fm_tipo">${Object.entries(TIPO_MAT).map(([k, t]) => `<option value="${k}" ${(v.tipo || 'documento') === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div><div class="f"><label>${propuesta ? 'Categoría sugerida' : 'Categoría'}</label><select id="fm_cat"><option value="">— Sin categoría —</option>${categorias.filter(c => c.activo).map(c => `<option value="${c.id}" ${v.categoria_id === c.id ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}</select></div></div>
    <div class="f"><label>Liga (video de YouTube no listado / Vimeo, o enlace)</label><input id="fm_url" value="${esc(v.url || '')}" placeholder="https://…"></div>
    <div class="f"><label>Archivo (PDF, Word, imagen…) <span class="muted">· opcional si pusiste liga · máx. 25 MB</span></label><input type="file" id="fm_file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*">${v.storage_path ? `<div class="small muted">Ya hay un archivo cargado; si eliges otro lo sustituye.</div>` : ''}</div>
  </div>`, `<button class="btn" data-cerrar>Cancelar</button><button class="btn p" id="fm_ok">${propuesta ? 'Enviar propuesta' : 'Guardar'}</button>`);
  document.getElementById('fm_ok').onclick = async () => {
    const titulo = val('fm_t'); const f = document.getElementById('fm_file').files[0]; const url = val('fm_url');
    if (!titulo) { toast('Ponle título.'); return; } if (!f && !url && !v.storage_path) { toast('Agrega una liga o un archivo.'); return; }
    if (f && f.size > 25 * 1024 * 1024) { toast('El archivo pasa de 25 MB.'); return; }
    const btn = document.getElementById('fm_ok'); btn.disabled = true; btn.textContent = 'Guardando…';
    try {
      let storage_path = v.storage_path || null;
      if (f) storage_path = await api.subirMaterial(f, propuesta ? `propuestas/${perfilId}` : audiencia);
      const fila = { ...(material ? { id: material.id } : { audiencia, subido_por: perfilId, estado: propuesta ? 'propuesto' : 'aprobado', ...(propuesta ? {} : { aprobado_por: perfilId, aprobado_en: new Date().toISOString() }) }), titulo, descripcion: val('fm_d') || null, tipo: val('fm_tipo'), categoria_id: val('fm_cat') || null, url: url || null, storage_path };
      await api.guardarMaterial(fila); cerrarModal(); toast(propuesta ? 'Propuesta enviada a Dirección' : 'Material guardado'); alGuardar?.();
    } catch (e) { console.error(e); toast('No se pudo guardar: ' + (e.message || e)); btn.disabled = false; btn.textContent = 'Guardar'; }
  };
}
