/* SIGAE — índice de compatibilidad entre una persona (postulante o monitora) y un perfil de acompañamiento.
   Versión 1 con reglas sobre datos estructurados. Es una herramienta de apoyo: muestra el desglose y nunca decide.
   Regla pedida por Dirección: lo que no es indispensable no penaliza (la formación «deseable» y los criterios sin datos puntúan neutro). */

export const CRITERIOS = { formacion: 'Formación académica', experiencia: 'Experiencia', necesidades: 'Experiencia con las necesidades del caso', disponibilidad: 'Disponibilidad de horario y días', zona: 'Cercanía con la escuela' };
export const PESOS_BASE = { formacion: 25, experiencia: 25, necesidades: 20, disponibilidad: 15, zona: 15 };
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const aMin = h => { if (!h) return null; const [a, b] = String(h).slice(0, 5).split(':').map(Number); return a * 60 + (b || 0); };
const clamp = n => Math.max(0, Math.min(100, Math.round(n)));

/** Normaliza a una persona: desde una postulación (con detalle) o desde una monitora (perfiles + monitoras). */
export function personaDesdePostulacion(p, d) {
  d = d || {};
  return { formacion: d.formacion || null, experiencia_texto: [d.experiencia_texto, d.por_que_candidata, d.sabe_que_es_monitora, d.intereses].filter(Boolean).join(' '), anios: null, disponibilidad: d.disponibilidad || {}, ubicacion: [d.colonia, d.ciudad].filter(Boolean).join(' '), edad: d.edad || null, completa: !!d.completado_en };
}
export function personaDesdeMonitora(m) {
  const disp = m.disponibilidad || {}; const dias = []; let hi = null, hf = null;
  const map = { lun: 1, mar: 2, mie: 3, jue: 4, vie: 5, sab: 6, dom: 7 };
  Object.entries(disp).forEach(([k, rangos]) => { if (map[k] && Array.isArray(rangos) && rangos.length) { dias.push(map[k]); const [a, b] = rangos[0].split('-'); hi = hi == null ? a : (a < hi ? a : hi); hf = hf == null ? b : (b > hf ? b : hf); } });
  return { formacion: m.formacion || null, experiencia_texto: [m.experiencia, ...(m.especialidades || [])].filter(Boolean).join(' '), anios: null, disponibilidad: Object.keys(disp).length && !Array.isArray(disp.dias) ? { dias, hora_inicio: hi, hora_fin: hf } : disp, ubicacion: (m.zonas || []).join(' '), edad: null, completa: true };
}

/** Devuelve { porcentaje, desglose: {criterio: {puntaje, peso, nota}}, parcial }. */
export function calcular(persona, perfil, { etiquetaFormacion = k => k } = {}) {
  const pesos = { ...PESOS_BASE, ...(perfil.pesos || {}) }; const des = {}; let parcial = !persona.completa;
  // formación: requerida = 100 · deseable = 75 · otra = 40 (no se penaliza del todo) · sin dato = neutro 60
  if (!persona.formacion) des.formacion = { puntaje: 60, nota: 'Sin dato de formación (se conoce en la segunda etapa).' };
  else if ((perfil.formacion_requerida || []).includes(persona.formacion)) des.formacion = { puntaje: 100, nota: `${etiquetaFormacion(persona.formacion)}: coincide con la formación requerida.` };
  else if ((perfil.formacion_deseable || []).includes(persona.formacion)) des.formacion = { puntaje: 75, nota: `${etiquetaFormacion(persona.formacion)}: formación deseable.` };
  else if (!(perfil.formacion_requerida || []).length && !(perfil.formacion_deseable || []).length) des.formacion = { puntaje: 80, nota: 'El perfil no exige una formación específica.' };
  else des.formacion = { puntaje: 40, nota: `${etiquetaFormacion(persona.formacion)}: distinta a la requerida; valora la experiencia.` };
  // experiencia: palabras clave del perfil (experiencia, habilidades, conocimientos) presentes en lo que la persona escribió
  const txt = norm(persona.experiencia_texto); const claves = [...(perfil.habilidades || []), ...(perfil.conocimientos || []), ...norm(perfil.experiencia || '').split(/[,;.\n]+/)].map(norm).map(s => s.trim()).filter(s => s.length > 3);
  if (!txt) des.experiencia = { puntaje: 60, nota: 'Aún no describe su experiencia (segunda etapa).' };
  else if (!claves.length) des.experiencia = { puntaje: 80, nota: 'El perfil no detalla experiencia específica; describe la suya.' };
  else { const hits = claves.filter(c => txt.includes(c) || c.split(' ').filter(w => w.length > 4).some(w => txt.includes(w))); des.experiencia = { puntaje: clamp(45 + 55 * hits.length / claves.length), nota: hits.length ? `Menciona: ${hits.slice(0, 4).join(', ')}.` : 'No menciona lo que pide el perfil; revísalo en el CV.' }; }
  // necesidades del caso
  const nec = (perfil.necesidades || []).map(norm).filter(Boolean);
  if (!nec.length) des.necesidades = { puntaje: 80, nota: 'El perfil no lista necesidades específicas.' };
  else if (!txt) des.necesidades = { puntaje: 60, nota: 'Sin datos aún.' };
  else { const hits = nec.filter(n => txt.includes(n) || n.split(' ').filter(w => w.length > 3).some(w => txt.includes(w))); des.necesidades = { puntaje: clamp(40 + 60 * hits.length / nec.length), nota: hits.length ? `Experiencia relacionada con: ${hits.join(', ')}.` : 'No menciona experiencia con estas necesidades.' }; }
  // disponibilidad: días y horario
  const disp = persona.disponibilidad || {}; const diasP = (disp.dias || []).map(Number); const diasR = (perfil.dias || []).map(Number);
  if (!diasP.length && !disp.hora_inicio) des.disponibilidad = { puntaje: 60, nota: 'Sin disponibilidad registrada aún.' };
  else {
    const cubreDias = diasR.length ? diasR.filter(d => diasP.includes(d)).length / diasR.length : 1;
    let cubreHoras = 1; if (perfil.hora_inicio && perfil.hora_fin && disp.hora_inicio && disp.hora_fin) { const a = Math.max(aMin(perfil.hora_inicio), aMin(disp.hora_inicio)), b = Math.min(aMin(perfil.hora_fin), aMin(disp.hora_fin)); cubreHoras = Math.max(0, b - a) / (aMin(perfil.hora_fin) - aMin(perfil.hora_inicio)); }
    des.disponibilidad = { puntaje: clamp(100 * Math.min(cubreDias, cubreHoras)), nota: `Cubre ${Math.round(100 * cubreDias)} % de los días y ${Math.round(100 * cubreHoras)} % del horario.` };
  }
  // zona
  const zona = norm(perfil.zona); const ubi = norm(persona.ubicacion);
  if (!zona) des.zona = { puntaje: 80, nota: 'El perfil no indica zona.' };
  else if (!ubi) des.zona = { puntaje: 60, nota: 'Sin dirección registrada aún.' };
  else des.zona = { puntaje: ubi.includes(zona) || zona.includes(ubi) ? 100 : 55, nota: ubi.includes(zona) || zona.includes(ubi) ? `Vive en la zona ${perfil.zona}.` : `Vive en ${persona.ubicacion}; la escuela está en zona ${perfil.zona}. Confirma traslados.` };
  let suma = 0, tot = 0; for (const k of Object.keys(CRITERIOS)) { const w = Number(pesos[k]) || 0; des[k].peso = w; suma += des[k].puntaje * w; tot += w; }
  return { porcentaje: tot ? Math.round(suma / tot) : 0, desglose: des, parcial, pesos, calculado_en: new Date().toISOString() };
}

export const colorPct = p => p >= 75 ? 'ok' : p >= 55 ? 'warn' : 'bad';
export function htmlDesglose(c) {
  return `<div class="tend">${Object.entries(CRITERIOS).map(([k, t]) => { const d = c.desglose[k]; return `<div class="r" style="grid-template-columns:170px 1fr 56px"><span title="${t}">${t}<small class="muted"> · peso ${d.peso}</small></span><div class="tr"><i style="width:${d.puntaje}%;background:var(--navy-2)"></i></div><span class="mono muted">${d.puntaje}</span></div><div class="small muted" style="margin:-2px 0 6px">${d.nota}</div>`; }).join('')}</div>${c.parcial ? '<div class="small muted" style="margin-top:6px">Cálculo parcial: faltan datos de la segunda etapa; los criterios sin información puntúan neutro.</div>' : ''}`;
}
