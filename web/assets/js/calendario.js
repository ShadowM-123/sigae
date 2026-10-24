/* SIGAE — calendario mensual compartido (Dirección, monitora, familia).
   Recibe una función que devuelve los eventos de un rango: [{ fecha, hora, tipo, titulo, sub, id, accion }]. */
import { esc, hoyIso, fecha as fmtFecha, fechaLarga } from './ui.js';

export const TIPOS = {
  cumple: { ic: '🎂', color: '#E9A23B', tx: 'Cumpleaños' }, pago: { ic: '💳', color: '#2B4E86', tx: 'Pago' }, cita: { ic: '🩺', color: '#6B4FBB', tx: 'Cita con especialista' },
  evaluacion: { ic: '◔', color: '#2E8B57', tx: 'Evaluación' }, tarea: { ic: '☑', color: '#667085', tx: 'Tarea' }, visita_escolar: { ic: '🏫', color: '#C84B3A', tx: 'Visita escolar' },
  reunion: { ic: '👥', color: '#1F3A68', tx: 'Reunión' }, entrevista: { ic: '🗣', color: '#1F3A68', tx: 'Entrevista' }, capacitacion: { ic: '🎓', color: '#2E8B57', tx: 'Capacitación' }, general: { ic: '•', color: '#667085', tx: 'Evento' },
};
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const isoDe = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

export function montarCalendario(root, { cargar, alElegir, inicial, filtros = true } = {}) {
  const hoy = hoyIso(); let [y, m] = (inicial || hoy).split('-').map(Number); m -= 1; let diaSel = inicial || hoy; let ocultos = new Set(); let eventos = [];
  const estilo = root.querySelector('style') || (() => { const st = document.createElement('style'); st.textContent = `
    .cal{display:grid;gap:12px} .cal .cab{display:flex;align-items:center;gap:8px} .cal .cab h3{font-family:var(--serif);font-size:20px;font-weight:600;flex:1}
    .cal .grid7{display:grid;grid-template-columns:repeat(7,1fr);gap:4px} .cal .dn{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);text-align:center;padding:4px 0}
    .cal .d{min-height:56px;border:1px solid var(--line);border-radius:8px;padding:4px 5px;background:#fff;cursor:pointer;font-size:12px;position:relative} .cal .d.fuera{opacity:.35} .cal .d.hoy{border-color:var(--navy);box-shadow:inset 0 0 0 1px var(--navy)} .cal .d.sel{background:var(--sky)}
    .cal .d .n{font-weight:600} .cal .d .pts{display:flex;flex-wrap:wrap;gap:2px;margin-top:3px} .cal .d .pts i{width:7px;height:7px;border-radius:50%;display:block}
    .cal .d .tt{display:none;font-size:11px;line-height:1.2;margin-top:2px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap} @media(min-width:900px){.cal .d{min-height:84px} .cal .d .tt{display:block} .cal .d .pts{display:none}}
    .cal .filtros{display:flex;flex-wrap:wrap;gap:6px} .cal .filtros button{all:unset;cursor:pointer;font-size:12px;padding:4px 9px;border-radius:99px;border:1px solid var(--line-2);display:inline-flex;gap:5px;align-items:center} .cal .filtros button.off{opacity:.4;text-decoration:line-through}
    .cal .filtros button i{width:9px;height:9px;border-radius:50%;display:inline-block}
    .cal .dia-lista .ev{display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-bottom:1px solid var(--line)} .cal .dia-lista .ev:last-child{border-bottom:0} .cal .dia-lista .ev .ic{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;font-size:14px;color:#fff;flex:none}
    .cal .dia-lista .ev b{display:block;font-size:14px} .cal .dia-lista .ev .m{font-size:12.5px;color:var(--muted)}`; root.appendChild(st); return st; })();

  async function recargar() { const ini = isoDe(y, m, 1); const fin = isoDe(y, m + 1, 0).replace(/-00$/, ''); const ultimo = new Date(y, m + 1, 0).getDate(); eventos = await cargar(ini, isoDe(y, m, ultimo)); pintar(); }
  function pintar() {
    const primero = new Date(y, m, 1); const dow = (primero.getDay() + 6) % 7; const ultimo = new Date(y, m + 1, 0).getDate(); const ultimoPrev = new Date(y, m, 0).getDate();
    const celdas = []; for (let i = 0; i < dow; i++) celdas.push({ iso: isoDe(y, m - 1 < 0 ? y - 1 : y, (m + 11) % 12, ultimoPrev - dow + 1 + i), fuera: true, n: ultimoPrev - dow + 1 + i });
    for (let d = 1; d <= ultimo; d++) celdas.push({ iso: isoDe(y, m, d), n: d }); let k = 1; while (celdas.length % 7) celdas.push({ iso: isoDe(m + 1 > 11 ? y + 1 : y, (m + 1) % 12, k), fuera: true, n: k++ });
    const vis = eventos.filter(e => !ocultos.has(e.tipo)); const tiposPresentes = [...new Set(eventos.map(e => e.tipo))];
    const porDia = {}; vis.forEach(e => (porDia[e.fecha] ||= []).push(e));
    const sel = porDia[diaSel] || [];
    root.querySelector('.cal').innerHTML = `
      <div class="cab"><button class="btn s" data-mes="-1">‹</button><h3>${MESES[m]} ${y}</h3><button class="btn s" data-hoy>Hoy</button><button class="btn s" data-mes="1">›</button></div>
      ${filtros ? `<div class="filtros">${tiposPresentes.map(t => `<button data-f="${t}" class="${ocultos.has(t) ? 'off' : ''}"><i style="background:${TIPOS[t]?.color || '#999'}"></i>${TIPOS[t]?.tx || t}</button>`).join('')}</div>` : ''}
      <div class="grid7">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => `<div class="dn">${d}</div>`).join('')}${celdas.map(c => { const evs = porDia[c.iso] || []; return `<div class="d ${c.fuera ? 'fuera' : ''} ${c.iso === hoy ? 'hoy' : ''} ${c.iso === diaSel ? 'sel' : ''}" data-dia="${c.iso}"><span class="n">${c.n}</span><div class="pts">${evs.slice(0, 6).map(e => `<i style="background:${TIPOS[e.tipo]?.color || '#999'}"></i>`).join('')}</div>${evs.slice(0, 3).map(e => `<div class="tt" style="color:${TIPOS[e.tipo]?.color}">${TIPOS[e.tipo]?.ic || ''} ${esc(e.titulo)}</div>`).join('')}${evs.length > 3 ? `<div class="tt muted">+${evs.length - 3} más</div>` : ''}</div>`; }).join('')}</div>
      <div class="card"><div class="hd"><h3>${diaSel === hoy ? 'Hoy · ' : ''}${fechaLarga(diaSel)}</h3><div class="sp"></div><span class="small muted">${sel.length} ${sel.length === 1 ? 'evento' : 'eventos'}</span></div><div class="bd dia-lista">${sel.sort((a, b) => (a.hora || '').localeCompare(b.hora || '')).map(e => `<div class="ev" ${e.accion ? `data-ev="${e.id}" style="cursor:pointer"` : ''}><div class="ic" style="background:${TIPOS[e.tipo]?.color || '#999'}">${TIPOS[e.tipo]?.ic || '•'}</div><div style="flex:1"><b>${e.hora ? e.hora.slice(0, 5) + ' · ' : ''}${esc(e.titulo)}</b><div class="m">${esc(e.sub || '')}</div></div>${e.accion ? '<span class="btn s">Abrir</span>' : ''}</div>`).join('') || '<div class="vacio">Nada programado este día.</div>'}</div></div>`;
    root.querySelectorAll('[data-mes]').forEach(b => b.onclick = () => { m += Number(b.dataset.mes); if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } recargar(); });
    root.querySelector('[data-hoy]').onclick = () => { [y, m] = hoy.split('-').map(Number); m -= 1; diaSel = hoy; recargar(); };
    root.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { ocultos.has(b.dataset.f) ? ocultos.delete(b.dataset.f) : ocultos.add(b.dataset.f); pintar(); });
    root.querySelectorAll('[data-dia]').forEach(c => c.onclick = () => { diaSel = c.dataset.dia; if (c.classList.contains('fuera')) { [y, m] = diaSel.split('-').map(Number); m -= 1; recargar(); } else { pintar(); alElegir?.(diaSel); } });
    root.querySelectorAll('[data-ev]').forEach(c => c.onclick = () => { const e = eventos.find(x => String(x.id) === c.dataset.ev); e?.accion?.(e); });
  }
  if (!root.querySelector('.cal')) { const d = document.createElement('div'); d.className = 'cal'; root.appendChild(d); }
  recargar();
  return { recargar, get dia() { return diaSel; } };
}
