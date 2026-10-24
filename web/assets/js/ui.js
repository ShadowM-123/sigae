/* SIGAE — utilidades de interfaz compartidas. */
import { modoDemo, ruta, reiniciarDemo } from './supabase.js';

export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export const hoyIso = () => { const x = new Date(); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
export const sumarDias = (iso, n) => { const x = new Date(iso + 'T12:00:00'); x.setDate(x.getDate() + n); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
export const diasEntre = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);
export const fecha = iso => { if (!iso) return '—'; const [y, m, d] = iso.slice(0, 10).split('-'); return `${+d} ${MESES[+m - 1]} ${y}`; };
export const fechaLarga = iso => { if (!iso) return '—'; const x = new Date(iso.slice(0, 10) + 'T12:00:00'); return `${DIAS[x.getDay()]} ${x.getDate()} de ${MESES_L[x.getMonth()]}`; };
export const hora = ts => { if (!ts) return ''; const m = String(ts).match(/T(\d\d):(\d\d)/); return m ? `${m[1]}:${m[2]}` : ''; };
export const horaCorta = h => h ? h.slice(0, 5) : '';
export const esFinDeSemana = iso => [0, 6].includes(new Date(iso + 'T12:00:00').getDay());
export const relativo = iso => { const d = diasEntre(hoyIso(), iso); if (d === 0) return 'hoy'; if (d === 1) return 'mañana'; if (d === -1) return 'ayer'; if (d > 1) return `en ${d} días`; return `hace ${-d} días`; };
export const edadTexto = nac => { if (!nac) return ''; const n = new Date(nac + 'T12:00:00'), h = new Date(); let a = h.getFullYear() - n.getFullYear(), m = h.getMonth() - n.getMonth(); if (h.getDate() < n.getDate()) m--; if (m < 0) { a--; m += 12; } return `${a} años${m ? ` y ${m} mes${m > 1 ? 'es' : ''}` : ''}`; };
export const iniciales = n => (n || '?').split(' ').filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();
export const nombreCorto = n => (n || '').split(' ').slice(0, 2).join(' ');
export const dinero = n => n == null ? '—' : '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 });
export const proximoCumple = nac => { if (!nac) return null; const h = new Date(hoyIso() + 'T12:00:00'); const [, m, d] = nac.split('-').map(Number); let c = new Date(h.getFullYear(), m - 1, d, 12); if (c < h) c = new Date(h.getFullYear() + 1, m - 1, d, 12); c.setMinutes(c.getMinutes() - c.getTimezoneOffset()); const iso = c.toISOString().slice(0, 10); return { fecha: iso, dias: diasEntre(hoyIso(), iso) }; };

export function toast(msg, ms = 2600) { let t = document.getElementById('toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); } t.textContent = msg; t.classList.add('on'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('on'), ms); }

export function modal(titulo, cuerpo, pie) {
  let m = document.getElementById('modal');
  if (!m) { m = document.createElement('div'); m.id = 'modal'; m.className = 'modal'; m.innerHTML = '<div class="caja"><div class="hd"><h3 id="mTtl"></h3><button class="x" aria-label="Cerrar">×</button></div><div class="bd" id="mBd"></div><div class="ft" id="mFt"></div></div>'; document.body.appendChild(m); m.addEventListener('click', e => { if (e.target === m || e.target.classList.contains('x')) cerrarModal(); }); }
  m.querySelector('#mTtl').innerHTML = titulo; m.querySelector('#mBd').innerHTML = cuerpo; m.querySelector('#mFt').innerHTML = pie ?? '<button class="btn" data-cerrar>Cerrar</button>';
  m.querySelectorAll('[data-cerrar]').forEach(b => b.onclick = cerrarModal); m.classList.add('on'); document.body.style.overflow = 'hidden'; return m;
}
export function cerrarModal() { const m = document.getElementById('modal'); if (m) m.classList.remove('on'); document.body.style.overflow = ''; }

export const val = id => { const el = document.getElementById(id); return el ? (el.type === 'checkbox' ? el.checked : el.value.trim()) : ''; };

/** Marco común: barra superior con quién entró, aviso de demo y pestañas. */
export function marco({ perfil, tabs, activa, onTab, subtitulo, clase = '' }) {
  if (modoDemo) document.body.classList.add('con-demo');
  const top = document.createElement('div');
  top.innerHTML = `
  <header class="topbar"><img class="logo" src="assets/img/logo-shadow.png" alt="Shadow" onerror="this.onerror=null;this.src='assets/img/logo-shadow.svg'"><div class="marca"><b>SIGAE</b><small>${esc(subtitulo || 'SHADOW Monitoras Educativas')}</small></div>
    <div class="quien"><b>${esc(perfil.nombre)}</b>${esc({ direccion: 'Dirección', asistente: 'Asistente de Dirección', monitora: 'Monitora educativa', familia: 'Familia', especialista: 'Especialista' }[perfil.rol] || '')}</div>
    <button class="salir" id="btnSalir">Salir</button></header>
  ${modoDemo ? '<div class="aviso-demo"><b>Demo.</b> Datos ficticios guardados solo en este navegador.<button id="btnReiniciarDemo">Reiniciar demo</button><button id="btnCambiarUsuario">Cambiar de usuario</button></div>' : ''}`;
  document.body.prepend(top);
  document.getElementById('btnSalir').onclick = async () => { const { db } = await import('./supabase.js'); await db.auth.signOut(); location.href = ruta('index.html'); };
  if (modoDemo) {
    document.getElementById('btnReiniciarDemo').onclick = async () => { if (confirm('¿Reiniciar todos los datos de la demo?')) { await reiniciarDemo(); location.reload(); } };
    document.getElementById('btnCambiarUsuario').onclick = async () => { const { db } = await import('./supabase.js'); await db.auth.signOut(); location.href = ruta('index.html'); };
  }
  const nav = document.getElementById('tabs');
  const pintar = (act) => { nav.innerHTML = tabs.map(t => t.grupo ? `<div class="grupo">${esc(t.grupo)}</div>` : `<button class="${t.id === act ? 'on' : ''} ${t.pronto ? 'off' : ''}" data-tab="${t.id}" ${t.pronto ? 'title="Llega en un paso posterior"' : ''}><span class="ic ${t.n ? 'pt' : ''}" ${t.n ? `data-n="${t.n}"` : ''}>${t.ic}</span><span>${esc(t.tx)}</span></button>`).join(''); nav.querySelectorAll('button').forEach(b => b.onclick = () => { const t = tabs.find(x => x.id === b.dataset.tab); if (t.pronto) { toast('Esta sección llega en un paso posterior de la construcción.'); return; } pintar(t.id); onTab(t.id); }); };
  pintar(activa);
  return { pintar };
}

export const estadoBitacora = e => ({ borrador: '<span class="tag warn">Borrador</span>', enviada: '<span class="tag ok">Enviada</span>', requiere_correccion: '<span class="tag bad">Requiere corrección</span>', corregida: '<span class="tag ok">Corregida</span>' }[e] || '');
export const valoracionTexto = n => ['', 'Muy difícil', 'Difícil', 'Regular', 'Bueno', 'Muy bueno'][n] || '';
