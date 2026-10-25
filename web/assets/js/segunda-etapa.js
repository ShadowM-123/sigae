/* SIGAE — formulario público de la segunda etapa (por enlace con token). Conserva los datos de contacto y guarda todo en la MISMA postulación. */
import { db, modoDemo } from './supabase.js';
import { esc, val, toast } from './ui.js';

const token = new URLSearchParams(location.search).get('t');
const zona = document.getElementById('zona'), sub = document.getElementById('sub');
const DIAS = [[1, 'Lun'], [2, 'Mar'], [3, 'Mié'], [4, 'Jue'], [5, 'Vie'], [6, 'Sáb']];

if (!token) { sub.textContent = ''; zona.innerHTML = '<div class="alerta bad"><span class="tx">Falta el enlace personal. Usa la liga que recibiste por correo.</span></div>'; }
else {
  const { data: p, error } = await db.rpc('segunda_etapa_cargar', { p_token: token });
  if (error) { sub.textContent = ''; zona.innerHTML = `<div class="alerta bad"><span class="tx">${esc(error.message)}</span></div>`; }
  else {
    const { data: fcat } = await db.from('catalogos').select('*').eq('tipo', 'formacion_academica').eq('activo', true).order('orden');
    const d = p.detalle || {}; const disp = d.disponibilidad || {};
    sub.innerHTML = `Hola <b>${esc(p.nombre)}</b> (folio ${esc(p.folio)}). ${p.completada ? 'Ya recibimos tu formulario; puedes corregirlo y volver a enviarlo.' : 'Cuéntanos más sobre ti. Toma unos 15 minutos y puedes guardar al final.'}${modoDemo ? ' <span class="tag warn">Demo</span>' : ''}`;
    const ref = (i, r = {}) => `<div class="card" style="margin-bottom:8px"><div class="bd form g2"><div class="f"><label>Centro de trabajo</label><input data-ref="${i}" data-k="centro_trabajo" value="${esc(r.centro_trabajo || '')}"></div><div class="f"><label>Persona de referencia</label><input data-ref="${i}" data-k="nombre" value="${esc(r.nombre || '')}"></div><div class="f"><label>Cargo</label><input data-ref="${i}" data-k="cargo" value="${esc(r.cargo || '')}"></div><div class="f"><label>Teléfono o correo</label><input data-ref="${i}" data-k="contacto" value="${esc(r.contacto || '')}"></div></div></div>`;
    zona.innerHTML = `<form id="f" class="form">
      <div class="card"><div class="hd"><h3>A. Datos personales</h3></div><div class="bd form g2">
        <div class="f"><label>Nombre completo</label><input value="${esc(p.nombre)}" disabled></div><div class="f"><label>Correo</label><input value="${esc(p.correo)}" disabled></div>
        <div class="f"><label>Fecha de nacimiento *</label><input type="date" id="s_nac" value="${d.fecha_nacimiento || ''}" required></div><div class="f"><label>Edad *</label><input type="number" id="s_edad" min="18" max="80" value="${d.edad || ''}" required></div>
        <div class="f full"><label>Calle y número *</label><input id="s_calle" value="${esc(d.calle_numero || '')}" required></div>
        <div class="f"><label>Colonia *</label><input id="s_col" value="${esc(d.colonia || '')}" required></div><div class="f"><label>Código postal</label><input id="s_cp" value="${esc(d.cp || '')}"></div>
        <div class="f full"><label>Ciudad o municipio *</label><input id="s_ciudad" value="${esc(d.ciudad || 'Chihuahua')}" required></div></div></div>
      <div class="card"><div class="hd"><h3>B. Formación académica</h3></div><div class="bd form">
        <div class="f"><label>Formación *</label><select id="s_form" required><option value="">Elige</option>${(fcat || []).map(c => `<option value="${esc(c.clave)}" ${d.formacion === c.clave ? 'selected' : ''}>${esc(c.etiqueta)}</option>`).join('')}</select></div>
        <div class="f oculto" id="w_otra"><label>¿Cuál?</label><input id="s_otra" value="${esc(d.formacion_otra || '')}"></div>
        <div class="f"><label>¿Cuentas con título profesional? *</label><select id="s_tit"><option value="">Elige</option><option value="1" ${d.tiene_titulo === true ? 'selected' : ''}>Sí</option><option value="0" ${d.tiene_titulo === false ? 'selected' : ''}>No</option></select></div>
        <div class="f oculto" id="w_ced"><label>¿Cuentas con cédula profesional?</label><select id="s_ced"><option value="">Elige</option><option value="1" ${d.tiene_cedula === true ? 'selected' : ''}>Sí</option><option value="0" ${d.tiene_cedula === false ? 'selected' : ''}>No</option></select></div>
        <div class="f oculto" id="w_num"><label>Número de cédula</label><input id="s_num" value="${esc(d.cedula || '')}"></div>
        <div class="f"><label>Cuéntanos tu experiencia profesional (dónde, con quién, cuánto tiempo) *</label><textarea id="s_exp" required>${esc(d.experiencia_texto || '')}</textarea></div></div></div>
      <div class="card"><div class="hd"><h3>C. Intereses personales</h3></div><div class="bd form"><div class="f"><label>¿Qué te gusta hacer? Pasatiempos, actividades, intereses</label><textarea id="s_int">${esc(d.intereses || '')}</textarea></div></div></div>
      <div class="card"><div class="hd"><h3>D. Situación laboral y disponibilidad</h3></div><div class="bd form">
        <div class="f"><label>¿Actualmente trabajas? *</label><select id="s_trab"><option value="">Elige</option><option value="1" ${d.trabaja_actualmente === true ? 'selected' : ''}>Sí</option><option value="0" ${d.trabaja_actualmente === false ? 'selected' : ''}>No</option></select></div>
        <div class="f oculto" id="w_hor"><label>Tu horario laboral actual</label><input id="s_hor" value="${esc(d.horario_actual || '')}" placeholder="Ej. lunes a viernes de 15:00 a 20:00"></div>
        <div class="f"><label>Días en que podrías trabajar como monitora *</label><div class="row" style="gap:6px">${DIAS.map(([n, t]) => `<label class="chk small" style="border:1px solid var(--line-2);border-radius:8px;padding:6px 10px"><input type="checkbox" data-dia="${n}" ${(disp.dias || []).includes(n) ? 'checked' : ''}> ${t}</label>`).join('')}</div></div>
        <div class="form g2"><div class="f"><label>Desde las *</label><input type="time" id="s_hi" value="${disp.hora_inicio || '07:30'}" required></div><div class="f"><label>Hasta las *</label><input type="time" id="s_hf" value="${disp.hora_fin || '14:30'}" required></div></div>
        <div class="f"><label>Expectativa económica mensual *</label><input id="s_eco" value="${esc(d.expectativa_economica || '')}" placeholder="Ej. $9,000 a $11,000" required></div></div></div>
      <div class="card"><div class="hd"><h3>E. Conocimiento del puesto</h3></div><div class="bd form">
        <div class="f"><label>¿Sabes qué es una monitora educativa y cuáles son sus funciones? *</label><textarea id="s_q1" required>${esc(d.sabe_que_es_monitora || '')}</textarea></div>
        <div class="f"><label>¿Por qué consideras que eres una buena candidata o un buen candidato para trabajar con SHADOW? *</label><textarea id="s_q2" required>${esc(d.por_que_candidata || '')}</textarea></div></div></div>
      <div class="card"><div class="hd"><h3>F. Referencias laborales</h3><span class="small muted">mínimo dos</span></div><div class="bd" id="refs">${ref(0, (d.referencias || [])[0]) + ref(1, (d.referencias || [])[1])}<button type="button" class="btn s" id="masRef">＋ Otra referencia</button></div></div>
      <div id="error" class="alerta bad oculto"><span class="tx"></span></div>
      <button class="btn p g" type="submit" id="btnOk">${p.completada ? 'Guardar cambios' : 'Enviar formulario'}</button>
    </form>`;
    const cond = () => { document.getElementById('w_otra').classList.toggle('oculto', val('s_form') !== 'otra'); const t = val('s_tit'); document.getElementById('w_ced').classList.toggle('oculto', t !== '1'); document.getElementById('w_num').classList.toggle('oculto', !(t === '1' && val('s_ced') === '1')); document.getElementById('w_hor').classList.toggle('oculto', val('s_trab') !== '1'); };
    ['s_form', 's_tit', 's_ced', 's_trab'].forEach(id => document.getElementById(id).onchange = cond); cond();
    let nRef = 2; document.getElementById('masRef').onclick = () => { document.getElementById('masRef').insertAdjacentHTML('beforebegin', ref(nRef++)); };
    document.getElementById('f').onsubmit = async e => {
      e.preventDefault();
      const refs = []; for (let i = 0; i < nRef; i++) { const r = {}; document.querySelectorAll(`[data-ref="${i}"]`).forEach(x => r[x.dataset.k] = x.value.trim()); if (Object.values(r).some(Boolean)) refs.push(r); }
      const errEl = document.getElementById('error'); const err = m => { errEl.classList.remove('oculto'); errEl.querySelector('.tx').textContent = m; window.scrollTo(0, document.body.scrollHeight); };
      if (refs.filter(r => r.nombre && r.contacto).length < 2) { err('Necesitamos al menos dos referencias con nombre y contacto.'); return; }
      const dias = [...document.querySelectorAll('[data-dia]:checked')].map(c => Number(c.dataset.dia)); if (!dias.length) { err('Marca al menos un día de disponibilidad.'); return; }
      const detalle = { edad: Number(val('s_edad')), fecha_nacimiento: val('s_nac'), calle_numero: val('s_calle'), colonia: val('s_col'), cp: val('s_cp'), ciudad: val('s_ciudad'), formacion: val('s_form'), formacion_otra: val('s_form') === 'otra' ? val('s_otra') : null, tiene_titulo: val('s_tit') === '1', tiene_cedula: val('s_tit') === '1' ? val('s_ced') === '1' : false, cedula: val('s_ced') === '1' ? val('s_num') : null, intereses: val('s_int'), trabaja_actualmente: val('s_trab') === '1', horario_actual: val('s_trab') === '1' ? val('s_hor') : null, disponibilidad: { dias, hora_inicio: val('s_hi'), hora_fin: val('s_hf') }, expectativa_economica: val('s_eco'), sabe_que_es_monitora: val('s_q1'), por_que_candidata: val('s_q2'), experiencia_texto: val('s_exp') };
      const btn = document.getElementById('btnOk'); btn.disabled = true; btn.textContent = 'Guardando…';
      const { error } = await db.rpc('segunda_etapa_guardar', { p_token: token, p_detalle: detalle, p_referencias: refs });
      if (error) { err(error.message); btn.disabled = false; btn.textContent = 'Enviar formulario'; return; }
      zona.innerHTML = `<div class="card"><div class="bd" style="text-align:center;padding:28px 18px"><div style="font-size:40px">✅</div><h2 style="font-family:var(--serif);font-weight:800;margin:8px 0">¡Gracias, ${esc(p.nombre.split(' ')[0])}!</h2><p>Recibimos tu formulario (folio ${esc(p.folio)}). Dirección lo revisará y te escribirá a <b>${esc(p.correo)}</b>.</p></div></div>`; sub.textContent = ''; window.scrollTo(0, 0);
    };
  }
}
