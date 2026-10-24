/* SIGAE — sesión y perfil actual. */
import { db, ruta } from './supabase.js';

const PAGINA_POR_ROL = { direccion: 'direccion.html', asistente: 'direccion.html', monitora: 'monitora.html', familia: 'familia.html', especialista: 'especialista.html' };

export async function usuarioActual() {
  const { data } = await db.auth.getUser();
  return data?.user || null;
}

export async function perfilActual() {
  const u = await usuarioActual(); if (!u) return null;
  const { data } = await db.from('perfiles').select('*').eq('id', u.id).maybeSingle();
  return data;
}

/** Exige sesión y rol; si no, manda a la entrada o a la página que le toca. */
export async function exigir(roles) {
  const p = await perfilActual();
  if (!p) { location.replace(ruta('index.html')); return new Promise(() => {}); }
  if (roles && !roles.includes(p.rol)) { location.replace(ruta(PAGINA_POR_ROL[p.rol] || 'index.html')); return new Promise(() => {}); }
  // registro de acceso (una vez por sesión de navegador y día)
  try { const k = 'sigae_acceso_' + p.id + '_' + new Date().toDateString(); if (!sessionStorage.getItem(k)) { await db.from('accesos_sesion').insert({ perfil_id: p.id, dispositivo: /Mobi|Android/i.test(navigator.userAgent) ? 'celular' : 'computadora' }); sessionStorage.setItem(k, '1'); } } catch (e) {}
  return p;
}

export const paginaDe = rol => PAGINA_POR_ROL[rol] || 'index.html';
