// TODOmás · función "reset-password"
// El admin genera una contraseña temporal para alguien que la pidió desde
// el login ("¿Olvidaste tu contraseña?"). Sin solicitud pendiente, no hace nada.
// Al entrar con la temporal, la app obliga a elegir una nueva.
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

// Sin letras que se confunden (l, I, O, 0, 1) para dictarla fácil
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
function tempPassword(n = 12) {
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

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
  if (!/^[0-9a-f-]{36}$/.test(userId) || userId === me.id) return reply({ error: "TODOMAS_FORBIDDEN" }, 400);

  // Solo si esa persona lo pidió en los últimos 7 días
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: request } = await admin.from("password_reset_requests")
    .select("id").eq("user_id", userId).is("resolved_at", null).gte("requested_at", since).maybeSingle();
  if (!request) return reply({ error: "TODOMAS_NO_RESET_REQUEST" }, 409);

  const password = tempPassword();
  const { error: updateError } = await admin.auth.admin.updateUserById(userId, { password });
  if (updateError) return reply({ error: updateError.message }, 500);

  await admin.from("profiles").update({ must_change_password: true }).eq("id", userId);
  await admin.from("password_reset_requests")
    .update({ resolved_at: new Date().toISOString(), resolved_by: me.id }).eq("id", request.id);

  return reply({ password });
});
