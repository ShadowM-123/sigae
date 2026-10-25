/* SIGAE — documentos imprimibles (PDF desde el navegador): bitácora diaria, compendio semanal y mensual.
   NUNCA incluyen la sección confidencial de la monitora, sin importar quién descargue. */
import * as api from './api.js';
import { renderLectura } from './bitacora.js';
import { htmlResumen, SECCIONES, nombrePeriodo } from './resumen.js';
import { TIPOS, htmlComparativo, htmlObjetivos } from './evaluacion.js';
import { esc, fecha, fechaLarga, hora, horaCorta, nombreCorto, edadTexto, toast } from './ui.js';

const CSS_DOC = `
  @page{size:letter;margin:16mm 14mm}
  body{background:#fff;color:#2A2A2E;font-size:12.5px;line-height:1.4;max-width:820px;margin:0 auto;padding:18px}
  .doc-cab{display:flex;align-items:center;gap:14px;border-bottom:3px solid #6CBE45;padding-bottom:10px;margin-bottom:14px}
  .doc-cab img{height:48px} .doc-cab h1{font-size:20px;margin:0;font-weight:800} .doc-cab .m{color:#6B6F76;font-size:12px}
  .doc-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:6px 14px;font-size:12px;margin-bottom:14px;padding:10px 12px;background:#F6FAF1;border-radius:10px}
  .doc-meta b{display:block;color:#6B6F76;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
  .doc-sec{page-break-inside:avoid;break-inside:avoid;border:1px solid #EFE7DB;border-radius:10px;padding:10px 14px;margin-bottom:12px}
  .doc-sec h2{font-size:15px;margin:0 0 6px;font-weight:800} .doc-sec h2 small{color:#6B6F76;font-weight:500;font-size:12px}
  .lectura .sec{padding:7px 0;border-bottom:1px solid #EFE7DB} .lectura .sec h4{font-size:10.5px;margin-bottom:2px} .lectura .sec p{font-size:12.5px} .lectura .val{font-size:22px}
  .lectura .chips span{font-size:11px;padding:2px 8px} .mini-bloques span{font-size:9px;padding:3px 1px} .mini-bloques span b{font-size:9.5px}
  .fotos{grid-template-columns:repeat(4,1fr)} .fotos img{aspect-ratio:1}
  .resumen-doc .sec{padding:6px 0;border-bottom:1px solid #EFE7DB} .resumen-doc .sec h4{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#6B6F76;margin:0 0 3px} .resumen-doc li{margin-bottom:2px}
  .salto{page-break-before:always;break-before:page}
  .doc-pie{margin-top:18px;border-top:1px solid #EFE7DB;padding-top:8px;font-size:10.5px;color:#6B6F76;display:flex;justify-content:space-between;gap:10px}
  .doc-aviso{background:#FFF4D1;border:1px solid #F3DFA0;border-radius:8px;padding:8px 12px;font-size:11.5px;margin:14px 0}
  .btn-imprimir{position:fixed;right:16px;top:16px;background:#3A8A2E;color:#fff;border:0;border-radius:10px;padding:10px 16px;font:inherit;font-weight:700;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.2)}
  @media print{.btn-imprimir{display:none} body{padding:0}}`;

/** Muestra el documento en una vista de impresión dentro de la misma página (sin ventanas emergentes) y abre el diálogo de imprimir / guardar como PDF. */
function abrir(titulo, cuerpo) {
  const css = new URL('assets/css/sigae.css', location.href).href; const logo = new URL('assets/img/logo-shadow.png', location.href).href; const logoSvg = new URL('assets/img/logo-shadow.svg', location.href).href;
  const html = `<!DOCTYPE html><html lang="es-MX"><head><meta charset="utf-8"><title>${esc(titulo)}</title><link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet"><link rel="stylesheet" href="${css}"><style>${CSS_DOC}</style></head><body>
    <div class="doc-cab"><img src="${logo}" alt="SHADOW" onerror="this.onerror=null;this.src='${logoSvg}'"><div><h1>${esc(titulo)}</h1><div class="m">SIGAE · SHADOW Monitoras Educativas</div></div></div>
    ${cuerpo}
    <div class="doc-pie"><span>Documento generado el ${fechaLarga(new Date().toISOString().slice(0, 10))} a las ${new Date().toTimeString().slice(0, 5)}.</span><span>Uso exclusivo de la familia, la escuela y SHADOW. No incluye información confidencial del equipo.</span></div>
  </body></html>`;
  document.getElementById('vistaPdf')?.remove();
  const ov = document.createElement('div'); ov.id = 'vistaPdf';
  ov.style.cssText = 'position:fixed;inset:0;z-index:60;background:#3b3b40;display:flex;flex-direction:column';
  ov.innerHTML = `<div style="display:flex;gap:10px;align-items:center;padding:10px 14px;background:#2A2A2E;color:#fff"><b style="flex:1;font-size:14px">${esc(titulo)}</b><span class="small" style="color:#C9D2E6">Sin información confidencial del equipo</span><button class="btn p s" id="pdfImprimir">Imprimir o guardar como PDF</button><button class="btn s" id="pdfCerrar">Cerrar</button></div><iframe id="pdfMarco" title="${esc(titulo)}" style="flex:1;border:0;background:#fff;width:100%"></iframe>`;
  document.body.appendChild(ov); document.body.style.overflow = 'hidden';
  const fr = ov.querySelector('#pdfMarco'); fr.srcdoc = html;
  const cerrar = () => { ov.remove(); document.body.style.overflow = ''; };
  ov.querySelector('#pdfCerrar').onclick = cerrar;
  ov.querySelector('#pdfImprimir').onclick = () => { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) { toast('No se pudo abrir el diálogo de impresión.'); } };
}

const meta = (est, moni, extra = []) => `<div class="doc-meta"><div><b>Estudiante</b>${esc(est.nombre)}${est.fecha_nacimiento ? ` · ${edadTexto(est.fecha_nacimiento)}` : ''}</div><div><b>Escuela</b>${esc(est.escuela || '')}${est.grado ? ` · ${esc(est.grado)}` : ''}</div><div><b>Monitora</b>${esc(moni?.nombre || '—')}</div>${extra.map(([k, v]) => `<div><b>${k}</b>${v}</div>`).join('')}</div>`;

async function conFotos(sub) { for (const f of sub.fotos) if (!f._url) f._url = await api.urlFoto(f.storage_path); return sub; }

/** Bitácora diaria. */
export async function pdfBitacora(b, est, moni, cat) {
  const sub = await conFotos(await api.subtablas(b.id, { conConfidencial: false }));
  abrir(`Bitácora diaria · ${fecha(b.fecha_jornada)}`, `${meta(est, moni, [['Jornada', fechaLarga(b.fecha_jornada)], ['Enviada', b.enviada_en ? `${fecha(b.enviada_en)} ${hora(b.enviada_en)}` : 'Borrador']])}<div class="doc-sec lectura">${renderLectura({ b, sub, cat, est, monitora: moni, confidencial: false })}</div>`);
}

/** Compendio semanal o mensual: resumen del periodo + cada bitácora. */
export async function pdfCompendio({ est, moni, periodo, resumen, cat }) {
  const bs = (await api.bitacorasDe(est.id, { desde: periodo.inicio, hasta: periodo.fin, limite: 200 })).filter(b => b.estado !== 'borrador').sort((a, b) => a.fecha_jornada.localeCompare(b.fecha_jornada));
  const subMap = await api.subtablasLote(bs.map(b => b.id)); for (const id in subMap) await conFotos(subMap[id]);
  const titulo = `${periodo.tipo === 'semanal' ? 'Compendio semanal' : 'Compendio mensual'} · ${nombreCorto(est.nombre)}`;
  const cuerpo = `${meta(est, moni, [['Periodo', `${fecha(periodo.inicio)} – ${fecha(periodo.fin)}`], ['Bitácoras', `${bs.length}`], ['Resumen', resumen ? (resumen.estado === 'publicado' ? 'Revisado y publicado por Dirección' : 'Borrador automático, no revisado') : 'Sin resumen']])}
    ${resumen ? `<div class="doc-sec"><h2>Resumen del periodo <small>${esc(nombrePeriodo(periodo))}</small></h2>${htmlResumen(resumen)}</div>` : '<div class="doc-aviso">Este compendio no tiene resumen del periodo. Dirección puede generarlo desde SIGAE.</div>'}
    ${resumen && resumen.estado !== 'publicado' ? '<div class="doc-aviso">El resumen es un borrador generado automáticamente y aún no ha sido revisado por Dirección.</div>' : ''}
    ${bs.map((b, i) => `<div class="doc-sec lectura ${i === 0 ? 'salto' : ''}"><h2>${fechaLarga(b.fecha_jornada)} <small>enviada ${fecha(b.enviada_en)} ${hora(b.enviada_en)}</small></h2>${renderLectura({ b, sub: subMap[b.id], cat, est, monitora: moni, confidencial: false })}</div>`).join('') || '<div class="doc-aviso">No hay bitácoras enviadas en este periodo.</div>'}`;
  abrir(titulo, cuerpo);
}

/** Solo el resumen (una hoja). */
export function pdfResumen(r, est, moni) {
  abrir(`Resumen ${r.tipo} · ${nombreCorto(est.nombre)}`, `${meta(est, moni, [['Periodo', `${fecha(r.periodo_inicio)} – ${fecha(r.periodo_fin)}`]])}<div class="doc-sec">${htmlResumen(r)}</div>`);
}

/** Evaluaciones y objetivos del ciclo (comparativo). `paraFamilia` omite observaciones profesionales y notas internas. */
export function pdfEvaluaciones({ est, moni, ciclo, cmp, paraFamilia = false }) {
  const objs = cmp.objs.filter(o => !paraFamilia || o.visible_familia);
  abrir(`Evaluaciones del ciclo · ${nombreCorto(est.nombre)}`, `${meta(est, moni, [['Ciclo', esc(ciclo?.nombre || '—')], ['Evaluaciones aplicadas', cmp.hechas.map(ev => `${TIPOS[ev.tipo]} ${fecha(ev.fecha)}`).join(' · ') || 'ninguna']])}
    <div class="doc-sec"><h2>Comparativo por dimensión <small>escala 1 = con apoyo constante · 5 = de forma autónoma</small></h2>${htmlComparativo(cmp, { observaciones: !paraFamilia })}</div>
    <div class="doc-sec"><h2>Objetivos de acompañamiento</h2>${htmlObjetivos(objs)}</div>
    ${paraFamilia ? '<div class="doc-aviso">Este documento muestra los niveles y los objetivos. Las observaciones profesionales se comentan en persona con Dirección de SHADOW.</div>' : '<div class="doc-aviso">Los cambios entre evaluaciones son observaciones del equipo, no un diagnóstico. Se interpretan junto con las bitácoras y la valoración profesional.</div>'}`);
}
