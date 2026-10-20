// TODOmás · función "calendar"
// Entrega un calendario (.ics) con las fechas límite de cada persona para
// suscribirse desde Google Calendar ("Otros calendarios → Desde URL").
// Cada persona tiene su link secreto (Ajustes → Calendario).
// Deploy con "Verify JWT" desactivado.

import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const PRIO: Record<string, Record<number, string>> = {
  es: { 3: "Alta", 2: "Media", 1: "Baja" },
  en: { 3: "High", 2: "Medium", 1: "Low" },
};

// Texto ICS: escapar y doblar líneas a 75 bytes
const escText = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

function fold(line: string) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    if (new TextEncoder().encode(cur + ch).length > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = ch;
    } else cur += ch;
  }
  out.push(cur);
  return out.join("\r\n ");
}

const compactDate = (d: string) => d.replace(/-/g, "");
function nextDay(d: string) {
  const x = new Date(`${d}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + 1);
  return x.toISOString().slice(0, 10);
}
function plus30(d: string, t: string) {
  const x = new Date(`${d}T${t.slice(0, 5)}:00Z`);
  x.setUTCMinutes(x.getUTCMinutes() + 30);
  return x.toISOString().slice(0, 19).replace(/[-:]/g, "");
}

Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (!/^[a-f0-9]{32,128}$/.test(token)) return new Response("Not found", { status: 404 });

  const { data: secret } = await supabase
    .from("user_secrets").select("user_id").eq("calendar_token", token).maybeSingle();
  if (!secret) return new Response("Not found", { status: 404 });

  const { data: me } = await supabase
    .from("profiles").select("id, full_name, lang, active").eq("id", secret.user_id).maybeSingle();
  if (!me || !me.active) return new Response("Not found", { status: 404 });

  const { data: cfg } = await supabase.from("app_config").select("key, value");
  const conf = Object.fromEntries((cfg ?? []).map((r) => [r.key, r.value]));
  const tz = conf.timezone ?? "America/Santiago";
  const appUrl = conf.app_url ?? "";
  const lang = me.lang === "en" ? "en" : "es";

  // Lo que me toca hacer y los pedidos que yo hice a otros
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, detail, client, due_date, due_time, priority, created_by, assignee_id, updated_at")
    .neq("status", "done")
    .not("due_date", "is", null)
    .or(`assignee_id.eq.${me.id},created_by.eq.${me.id}`);

  const { data: people } = await supabase.from("profiles").select("id, full_name");
  const name = (id: string) => people?.find((p) => p.id === id)?.full_name ?? "";

  const now = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TODOmas//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escText(`TODOmás · ${me.full_name}`)}`,
    `X-WR-TIMEZONE:${tz}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];

  for (const t of tasks ?? []) {
    const mine = t.assignee_id === me.id;
    const isRequest = t.created_by !== t.assignee_id;
    let summary = t.title;
    if (mine && isRequest) summary = `${t.title} · ${name(t.created_by)}`;
    if (!mine) summary = `→ ${name(t.assignee_id)}: ${t.title}`;
    const desc = [
      t.client ? `${lang === "es" ? "Cliente" : "Client"}: ${t.client}` : "",
      `${lang === "es" ? "Prioridad" : "Priority"}: ${PRIO[lang][t.priority]}`,
      t.detail ?? "",
      appUrl ? `${appUrl}#/board?task=${t.id}` : "",
    ].filter(Boolean).join("\n");

    lines.push("BEGIN:VEVENT", `UID:${t.id}@todomas`, `DTSTAMP:${now}`);
    if (t.due_time) {
      lines.push(`DTSTART;TZID=${tz}:${compactDate(t.due_date)}T${t.due_time.slice(0, 5).replace(":", "")}00`);
      lines.push(`DTEND;TZID=${tz}:${plus30(t.due_date, t.due_time)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${compactDate(t.due_date)}`);
      lines.push(`DTEND;VALUE=DATE:${compactDate(nextDay(t.due_date))}`);
    }
    lines.push(`SUMMARY:${escText(summary)}`, `DESCRIPTION:${escText(desc)}`);
    if (appUrl) lines.push(`URL:${appUrl}#/board?task=${t.id}`);
    lines.push("TRANSP:TRANSPARENT", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");

  return new Response(lines.map(fold).join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="todomas.ics"',
      "Cache-Control": "no-store",
    },
  });
});
