/* SIGAE — plantillas de correo. Mientras Resend no está conectado, cada correo queda en `correos_enviados` como «pendiente»
   con el texto listo para copiar y mandar a mano desde Dirección. La función enviar-correo (Edge Function) los procesará después. */
import * as api from './api.js';

export const PLANTILLAS = {
  postulacion_recibida: { nombre: 'Postulación recibida' },
  invitacion_2a_etapa: { nombre: 'Invitación a la segunda etapa' },
  agradecimiento_cierre: { nombre: 'Agradecimiento (no continúa)' },
  invitacion_entrevista: { nombre: 'Invitación a entrevista' },
  seleccionada: { nombre: 'Bienvenida como monitora' },
};

export function redactar(plantilla, { nombre, folio, enlace, agenda, fecha } = {}) {
  const n = (nombre || '').split(' ')[0] || 'Hola';
  switch (plantilla) {
    case 'postulacion_recibida': return { asunto: 'Recibimos tu postulación · SHADOW', cuerpo: `Hola ${n}, recibimos tu postulación (folio ${folio}). Dirección la revisará y te escribiremos a este correo. Gracias por tu interés en SHADOW Monitoras Educativas.` };
    case 'invitacion_2a_etapa': return { asunto: 'Siguiente paso en tu postulación · SHADOW', cuerpo: `Hola ${n}, revisamos tu currículum y queremos conocerte mejor. Por favor completa el formulario de la segunda etapa en esta liga:\n\n${enlace}\n\nEs personal e intransferible y toma unos 15 minutos. Tu folio es ${folio}. Si tienes dudas, responde a este correo.\n\nSHADOW Monitoras Educativas` };
    case 'agradecimiento_cierre': return { asunto: 'Gracias por postularte a SHADOW', cuerpo: `Hola ${n}, gracias por el tiempo y el interés que pusiste en tu postulación (folio ${folio}). En esta ocasión decidimos continuar con otros perfiles que se ajustan mejor a las necesidades de la vacante. Nos encantaría coincidir en futuras oportunidades; conservaremos tus datos con tu permiso para avisarte de nuevas vacantes.\n\nCon aprecio,\nSHADOW Monitoras Educativas` };
    case 'invitacion_entrevista': return { asunto: 'Te invitamos a una entrevista · SHADOW', cuerpo: `Hola ${n}, nos gustó mucho lo que compartiste en la segunda etapa y queremos invitarte a una entrevista presencial. Elige el horario que mejor te acomode aquí:\n\n${agenda || '[Dirección confirmará fecha y hora contigo por este medio]'}\n\nTu folio es ${folio}. ¡Gracias!\n\nSHADOW Monitoras Educativas` };
    case 'seleccionada': return { asunto: '¡Bienvenida a SHADOW!', cuerpo: `Hola ${n}, ¡bienvenida al equipo de SHADOW! Ya tienes acceso a SIGAE, nuestra plataforma de acompañamiento. Entra con este correo en ${enlace} usando la contraseña que te hicimos llegar. Ahí encontrarás tu inducción en la Academia SHADOW y la información de tu estudiante cuando te sea asignado.\n\nSHADOW Monitoras Educativas` };
    default: return { asunto: 'SHADOW', cuerpo: '' };
  }
}

/** Deja el correo en la bandeja de salida (pendiente de Resend). */
export async function encolar(plantilla, destinatario, datos, relacion) {
  const { asunto, cuerpo } = redactar(plantilla, datos);
  const fila = await api.guardarCorreo({ destinatario, plantilla, asunto, cuerpo, relacion, estado: 'pendiente', fecha: new Date().toISOString() });
  try { await api.enviarCorreosPendientes(); } catch (e) { console.warn('Correo en espera (Resend aún no configurado):', e.message); }
  return fila;
}
