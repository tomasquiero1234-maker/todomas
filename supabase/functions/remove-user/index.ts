// TODOmás · función "remove-user"
// El admin quita a alguien de TODOmás: se borran sus datos (ver
// admin_purge_user en el esquema), sus archivos y su cuenta. No se puede deshacer.
// Deploy con "Verify JWT" desactivado: la sesión se valida aquí adentro.

import { createClient } from "npm:@supabase/supabase-js@2";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reply({ error: "METHOD_NOT_ALLOWED" }, 405);

  // ¿Quién llama? Tiene que ser un admin activo
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: who, error: authError } = await admin.auth.getUser(token);
  if (authError || !who?.user) return reply({ error: "TODOMAS_FORBIDDEN" }, 401);
  const { data: me } = await admin.from("profiles").select("id, role, active").eq("id", who.user.id).maybeSingle();
  if (!me || !me.active || me.role !== "admin") return reply({ error: "TODOMAS_FORBIDDEN" }, 403);

  let body: { user_id?: string } = {};
  try { body = await req.json(); } catch { /* cuerpo vacío */ }
  const userId = String(body.user_id ?? "");
  if (!/^[0-9a-f-]{36}$/.test(userId)) return reply({ error: "TODOMAS_FORBIDDEN" }, 400);
  if (userId === me.id) return reply({ error: "TODOMAS_CANNOT_REMOVE_SELF" }, 400);

  // 1) datos en la base (en una sola transacción)
  const { data: paths, error: purgeError } = await admin.rpc("admin_purge_user", { p_user: userId, p_admin: me.id });
  if (purgeError) {
    const code = (purgeError.message.match(/TODOMAS_[A-Z_]+/) || [purgeError.message])[0];
    return reply({ error: code }, 400);
  }

  // 2) archivos adjuntos
  if (Array.isArray(paths) && paths.length) {
    await admin.storage.from("attachments").remove(paths);
  }

  // 3) la cuenta (borra también su perfil)
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError && !/not found/i.test(deleteError.message)) return reply({ error: deleteError.message }, 500);

  return reply({ ok: true });
});
