// SIGAE — Edge Function `enviar-correo`
// 1) Envía por Resend los correos pendientes de la tabla `correos_enviados` (los encola el frontend: postulaciones,
//    invitaciones, avisos). 2) Con { accion: "invitar" } crea/invita a un usuario en Auth (familias, especialistas,
//    monitoras seleccionadas) usando la llave de servicio, que NUNCA sale de aquí.
// Solo puede llamarla Dirección (JWT de un perfil con rol direccion/asistente) o una tarea programada con CRON_KEY.
// Secrets necesarios (Supabase → Edge Functions → Secrets): RESEND_API_KEY, CRON_KEY (opcional, para el cron).
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-key" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!, service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service, { auth: { persistSession: false } });

  // --- quién llama ---
  const cronKey = Deno.env.get("CRON_KEY");
  const esCron = !!cronKey && req.headers.get("x-cron-key") === cronKey;
  let quien: string | null = null;
  if (!esCron) {
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!jwt) return json({ error: "Sin sesión" }, 401);
    const { data: u } = await admin.auth.getUser(jwt);
    if (!u?.user) return json({ error: "Sesión no válida" }, 401);
    const { data: p } = await admin.from("perfiles").select("rol").eq("id", u.user.id).maybeSingle();
    if (!p || !["direccion", "asistente"].includes(p.rol)) return json({ error: "Solo Dirección puede usar esta función" }, 403);
    quien = u.user.id;
  }

  let body: any = {}; try { body = await req.json(); } catch (_) { /* sin cuerpo = procesar pendientes */ }

  // --- invitar usuario (crear-usuario) ---
  if (body.accion === "invitar") {
    const correo = String(body.correo || "").trim().toLowerCase(); if (!correo) return json({ error: "Falta el correo" }, 400);
    const { data: cfg } = await admin.from("configuracion").select("clave, valor");
    const sitio = (cfg || []).find((c: any) => c.clave === "url_sitio")?.valor || "";
    const { data, error } = await admin.auth.admin.inviteUserByEmail(correo, { redirectTo: sitio ? sitio.replace(/\/?$/, "/") + "establecer-clave.html" : undefined, data: { nombre: body.nombre || "" } });
    if (error) {
      // si ya existe, devolvemos su id para que el frontend lo vincule
      const { data: lista } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const ya = lista?.users?.find((x: any) => (x.email || "").toLowerCase() === correo);
      if (ya) return json({ id: ya.id, existia: true });
      return json({ error: error.message }, 400);
    }
    return json({ id: data.user?.id, existia: false });
  }

  // --- enviar pendientes por Resend ---
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return json({ error: "Falta el secreto RESEND_API_KEY en Supabase → Edge Functions → Secrets", pendientes: true }, 200);
  const { data: cfg } = await admin.from("configuracion").select("clave, valor");
  const remitente = (cfg || []).find((c: any) => c.clave === "correo_remitente")?.valor || "SHADOW <onboarding@resend.dev>";
  const { data: pendientes } = await admin.from("correos_enviados").select("*").eq("estado", "pendiente").order("fecha").limit(Number(body.limite) || 20);
  let enviados = 0, errores = 0;
  for (const c of pendientes || []) {
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: remitente, to: [c.destinatario], subject: c.asunto, text: c.cuerpo || "" }) });
    const out = await r.json().catch(() => ({}));
    if (r.ok) { enviados++; await admin.from("correos_enviados").update({ estado: "enviado", resend_id: out.id || null, error: null }).eq("id", c.id); }
    else { errores++; await admin.from("correos_enviados").update({ estado: "error", error: JSON.stringify(out).slice(0, 500) }).eq("id", c.id); }
  }
  return json({ enviados, errores, por: quien || "cron" });
});
