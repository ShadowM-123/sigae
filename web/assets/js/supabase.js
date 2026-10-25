/* SIGAE — conexión a la base.
   Con ?demo=1 (o modo demo guardado) usa la base falsa; si no, el cliente real de Supabase.
   Las llaves de abajo son PÚBLICAS por diseño (anon key): la seguridad la ponen las políticas RLS. */

export const CONFIG = {
  url: 'https://osqeypstmwzguvwokomc.supabase.co',           // proyecto «sigae» en la organización de SHADOW (ver docs/04)
  anon: 'sb_publishable_4iszzNRZfEk0hGAbGb570g_nJAXjmBq',  // llave PÚBLICA (publishable); la seguridad la ponen las políticas RLS
};

const params = new URLSearchParams(location.search);
if (params.has('demo')) sessionStorage.setItem('sigae_modo', params.get('demo') === '0' ? 'real' : 'demo');
export const modoDemo = sessionStorage.getItem('sigae_modo') === 'demo' || CONFIG.url.includes('TU-PROYECTO');

export const db = modoDemo
  ? (await import('./demo/supabase-falso.js')).crearClienteFalso()
  : (await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')).createClient(CONFIG.url, CONFIG.anon);

/** Enlace interno que conserva el modo demo. */
export const ruta = (p) => p + (modoDemo && !p.includes('demo=') ? (p.includes('?') ? '&' : '?') + 'demo=1' : '');

export async function reiniciarDemo() {
  if (!modoDemo) return;
  const m = await import('./demo/supabase-falso.js');
  m.reiniciarBaseFalsa();
}
