/* SIGAE — página pública de postulación (sin cuenta). Sube el CV al bucket y llama a la función `postular`. */
import { db, modoDemo } from './supabase.js';
import { esc } from './ui.js';

const err = m => { const e = document.getElementById('error'); e.classList.remove('oculto'); e.querySelector('.tx').textContent = m; };
if (modoDemo) document.getElementById('aviso').innerHTML = '<div class="alerta warn" style="margin-bottom:12px"><span class="tx"><b>Demo.</b> Esta postulación se guarda solo en este navegador y aparecerá en la pestaña Reclutamiento de Dirección.</span></div>';

const { data: cat } = await db.from('catalogos').select('*').eq('tipo', 'como_se_entero').eq('activo', true).order('orden');
document.getElementById('p_como').innerHTML += (cat || []).map(c => `<option value="${esc(c.clave)}">${esc(c.etiqueta)}</option>`).join('');

document.getElementById('f').onsubmit = async e => {
  e.preventDefault(); document.getElementById('error').classList.add('oculto');
  const f = document.getElementById('p_cv').files[0];
  if (!f) { err('Adjunta tu currículum.'); return; } if (f.size > 10 * 1024 * 1024) { err('El archivo pasa de 10 MB.'); return; }
  const btn = document.getElementById('btnEnviar'); btn.disabled = true; btn.textContent = 'Enviando…';
  try {
    const ext = (f.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `entrantes/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const up = await db.storage.from('curriculums').upload(path, f); if (up.error) throw new Error('No se pudo subir el currículum: ' + up.error.message);
    const { data, error } = await db.rpc('postular', { p_nombre: document.getElementById('p_nombre').value.trim(), p_correo: document.getElementById('p_correo').value.trim(), p_telefono: document.getElementById('p_tel').value.trim(), p_como_se_entero: document.getElementById('p_como').value, p_cv_path: path });
    if (error) throw new Error(error.message);
    document.getElementById('cajaForm').classList.add('oculto'); document.getElementById('cajaOk').classList.remove('oculto');
    document.getElementById('okFolio').textContent = data.folio; document.getElementById('okCorreo').textContent = document.getElementById('p_correo').value.trim();
  } catch (x) { err(x.message || 'No se pudo enviar. Intenta de nuevo.'); btn.disabled = false; btn.textContent = 'Enviar mi postulación'; }
};
