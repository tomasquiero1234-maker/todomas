// TODOmás · función "notify"
// Manda por email los avisos pendientes (pedido nuevo, done, cambio de fecha,
// cancelación, por vencer y resumen diario). La llama el cron cada minuto,
// solo cuando hay algo que mandar.
//
// Secrets que hay que cargar en Supabase → Edge Functions → Secrets:
//   SMTP_USER      la cuenta que manda los avisos (Yahoo, Gmail…)
//   SMTP_PASSWORD  su "contraseña de aplicación"
//   SMTP_HOST      smtp.mail.yahoo.com para Yahoo (si no se pone: smtp.gmail.com)
// Deploy con "Verify JWT" desactivado.

import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const SMTP_HOST = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
const SMTP_USER = Deno.env.get("SMTP_USER") || Deno.env.get("GMAIL_USER") || "";
const SMTP_PASSWORD = (Deno.env.get("SMTP_PASSWORD") || Deno.env.get("GMAIL_APP_PASSWORD") || "").replace(/\s+/g, "");

// Supabase bloquea los puertos 25 y 587: siempre SSL por el 465
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: 465,
  secure: true,
  auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
});

type Lang = "es" | "en";
type Item = {
  task_id?: string;
  title: string;
  due_date?: string | null;
  due_time?: string | null;
  priority?: number;
  status?: string;
  client?: string | null;
  requester_name?: string | null;
};
type Row = {
  id: number;
  type: string;
  task_id: string | null;
  payload: Record<string, any>;
  created_at: string;
  recipient_email: string;
  recipient_name: string;
  lang: Lang;
  actor_name: string | null;
  actor_email: string | null;
  attempts: number;
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function fmtDue(lang: Lang, date?: string | null, time?: string | null) {
  if (!date) return lang === "es" ? "Sin fecha" : "No due date";
  const d = new Date(`${date}T12:00:00Z`);
  const txt = new Intl.DateTimeFormat(lang === "es" ? "es-CL" : "en-US", {
    weekday: "long", day: "numeric", month: "short", timeZone: "UTC",
  }).format(d);
  return time ? `${txt}, ${time}` : txt;
}

const PRIO: Record<Lang, Record<number, string>> = {
  es: { 3: "Alta", 2: "Media", 1: "Baja" },
  en: { 3: "High", 2: "Medium", 1: "Low" },
};

const L = {
  es: {
    open: "Abrir en TODOmás",
    footer: "Te llega este correo porque usas TODOmás. Puedes apagar los emails en Ajustes.",
    client: "Cliente", due: "Fecha límite", priority: "Prioridad", note: "Respuesta",
    queue: "Tu cola de hoy", noTitle: "(sin título)", doing: "En curso",
    from: (n: string) => `de ${n}`,
  },
  en: {
    open: "Open in TODOmás",
    footer: "You get this email because you use TODOmás. You can turn emails off in Settings.",
    client: "Client", due: "Due", priority: "Priority", note: "Reply",
    queue: "Your queue today", noTitle: "(untitled)", doing: "In progress",
    from: (n: string) => `from ${n}`,
  },
};

function detailsTable(lang: Lang, p: Record<string, any>) {
  const l = L[lang];
  const rows: [string, string][] = [];
  if (p.client) rows.push([l.client, esc(p.client)]);
  rows.push([l.due, esc(fmtDue(lang, p.due_date, p.due_time))]);
  if (p.priority) rows.push([l.priority, esc(PRIO[lang][p.priority])]);
  if (p.done_note) rows.push([l.note, esc(p.done_note).replace(/\n/g, "<br>")]);
  return `<table role="presentation" style="width:100%;border-collapse:collapse;margin:12px 0 20px">${
    rows.map(([k, v]) =>
      `<tr><td style="padding:6px 0;color:#64748b;width:120px;vertical-align:top">${k}</td>` +
      `<td style="padding:6px 0;color:#0f172a">${v}</td></tr>`).join("")
  }</table>`;
}

function itemsList(lang: Lang, items: Item[], numbered: boolean) {
  const l = L[lang];
  return `<ol style="padding-left:${numbered ? 20 : 0}px;margin:8px 0 20px;${numbered ? "" : "list-style:none"}">${
    items.map((it) => {
      const meta = [
        fmtDue(lang, it.due_date, it.due_time),
        it.priority ? PRIO[lang][it.priority] : "",
        it.requester_name ? l.from(it.requester_name) : "",
        it.status === "doing" ? l.doing : "",
      ].filter(Boolean).join(" · ");
      return `<li style="margin:0 0 10px"><div style="color:#0f172a;font-weight:600">${esc(it.title || l.noTitle)}</div>` +
        `<div style="color:#64748b;font-size:13px">${esc(meta)}</div></li>`;
    }).join("")
  }</ol>`;
}

function render(row: Row, appUrl: string) {
  const lang: Lang = row.lang === "en" ? "en" : "es";
  const p = row.payload ?? {};
  const actor = row.actor_name ?? "TODOmás";
  const title = p.title ?? "";
  const link = appUrl ? `${appUrl}#/board${row.task_id ? `?task=${row.task_id}` : ""}` : "";
  let subject = "", heading = "", intro = "", body = "";

  if (lang === "es") {
    switch (row.type) {
      case "new_request":
        subject = `Nuevo pedido de ${actor}: ${title}`;
        heading = title; intro = `${actor} te agendó un pedido.`;
        body = detailsTable(lang, p); break;
      case "done":
        subject = `Listo: ${title}`;
        heading = title; intro = `${actor} marcó tu pedido como Done.`;
        body = detailsTable(lang, p); break;
      case "date_changed":
        subject = `Cambió la fecha: ${title}`;
        heading = title;
        intro = `${actor} cambió la fecha límite de ${fmtDue(lang, p.old_due_date, p.old_due_time)} a ${fmtDue(lang, p.due_date, p.due_time)}.`;
        body = detailsTable(lang, p); break;
      case "cancelled":
        subject = `${actor} canceló un pedido: ${title}`;
        heading = title; intro = `${actor} borró este pedido; ya no está en tu cola.`; break;
      case "due_soon":
        subject = `Tienes ${p.count} pendiente${p.count === 1 ? "" : "s"} por vencer`;
        heading = "Por vencer"; intro = "Atrasados, para hoy o para mañana:";
        body = itemsList(lang, p.items ?? [], false); break;
      case "digest":
        subject = `Tu día en TODOmás: ${p.open} pendiente${p.open === 1 ? "" : "s"} en la cola`;
        heading = `Buenos días, ${row.recipient_name.split(" ")[0]}`;
        intro = `${p.open} en la cola · ${p.doing} en curso · ${p.due_soon} vencen hoy o mañana · ${p.new_24h} pedidos nuevos en 24 h.`;
        body = `<div style="color:#0f172a;font-weight:600;margin-top:8px">${L.es.queue}</div>` +
          itemsList(lang, p.items ?? [], true); break;
      default: return null;
    }
  } else {
    switch (row.type) {
      case "new_request":
        subject = `New request from ${actor}: ${title}`;
        heading = title; intro = `${actor} sent you a request.`;
        body = detailsTable(lang, p); break;
      case "done":
        subject = `Done: ${title}`;
        heading = title; intro = `${actor} marked your request as Done.`;
        body = detailsTable(lang, p); break;
      case "date_changed":
        subject = `Due date changed: ${title}`;
        heading = title;
        intro = `${actor} moved the due date from ${fmtDue(lang, p.old_due_date, p.old_due_time)} to ${fmtDue(lang, p.due_date, p.due_time)}.`;
        body = detailsTable(lang, p); break;
      case "cancelled":
        subject = `${actor} cancelled a request: ${title}`;
        heading = title; intro = `${actor} deleted this request; it is no longer in your queue.`; break;
      case "due_soon":
        subject = `You have ${p.count} item${p.count === 1 ? "" : "s"} coming due`;
        heading = "Coming due"; intro = "Overdue, due today or due tomorrow:";
        body = itemsList(lang, p.items ?? [], false); break;
      case "digest":
        subject = `Your day in TODOmás: ${p.open} item${p.open === 1 ? "" : "s"} in the queue`;
        heading = `Good morning, ${row.recipient_name.split(" ")[0]}`;
        intro = `${p.open} in the queue · ${p.doing} in progress · ${p.due_soon} due today or tomorrow · ${p.new_24h} new requests in 24h.`;
        body = `<div style="color:#0f172a;font-weight:600;margin-top:8px">${L.en.queue}</div>` +
          itemsList(lang, p.items ?? [], true); break;
      default: return null;
    }
  }

  const button = link
    ? `<a href="${esc(link)}" style="display:inline-block;background:#3b5bdb;color:#ffffff;padding:11px 18px;border-radius:8px;text-decoration:none;font-weight:600">${L[lang].open}</a>`
    : "";
  const html = `<!doctype html><html><body style="margin:0;background:#f3f4f7">
<div style="padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;line-height:1.45">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:24px">
    <div style="font-weight:800;font-size:18px;color:#0f172a;letter-spacing:-0.01em">TODO<span style="color:#3b5bdb">más</span></div>
    <h1 style="font-size:20px;line-height:1.3;margin:18px 0 6px;color:#0f172a">${esc(heading)}</h1>
    <p style="margin:0 0 4px;color:#475569">${esc(intro)}</p>
    ${body}
    ${button}
    <p style="color:#94a3b8;font-size:12px;margin:28px 0 0">${L[lang].footer}</p>
  </div>
</div></body></html>`;
  const text = `${heading}\n\n${intro}\n\n${link}`;
  return { subject, html, text };
}

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async () => {
  if (!SMTP_USER || !SMTP_PASSWORD) {
    return json({ ok: false, error: "Faltan los secrets SMTP_USER y SMTP_PASSWORD" }, 500);
  }
  const { data: cfg } = await supabase.from("app_config").select("key, value");
  const appUrl = (cfg ?? []).find((r) => r.key === "app_url")?.value ?? "";

  const { data, error } = await supabase.rpc("claim_pending_emails", { max_rows: 40 });
  if (error) return json({ ok: false, error: error.message }, 500);

  let sent = 0, failed = 0;
  for (const row of (data ?? []) as Row[]) {
    const mail = render(row, appUrl);
    if (!mail) {
      await supabase.from("notifications").update({ email_status: "skipped" }).eq("id", row.id);
      continue;
    }
    try {
      await transporter.sendMail({
        from: `"TODOmás" <${SMTP_USER}>`,
        to: row.recipient_email,
        replyTo: row.actor_email ?? undefined,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      });
      await supabase.from("notifications").update({ email_status: "sent", email_error: null }).eq("id", row.id);
      sent++;
    } catch (e) {
      failed++;
      await supabase.from("notifications").update({
        email_status: row.attempts >= 3 ? "error" : "pending",
        email_error: String(e).slice(0, 500),
      }).eq("id", row.id);
    }
  }
  return json({ ok: true, sent, failed });
});
