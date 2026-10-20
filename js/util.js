// Utilidades compartidas: fechas en hora de Chile, orden de la cola, colores.
import { CONFIG } from '../config.js';

export const TZ = CONFIG.timezone || 'America/Santiago';

// Colores de personas: orden fijo (azul, naranja, aqua, amarillo, magenta, verde, violeta, rojo)
export const PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];

export const uuid = () => crypto.randomUUID();
export const cls = (...xs) => xs.filter(Boolean).join(' ');
export const isRequest = (t) => t.created_by !== t.assignee_id;
export const locale = (lang) => (lang === 'en' ? 'en-US' : 'es-CL');

// ---------- fechas ----------
export function todayISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
export function nowHM() {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
}
export function tsToLocalDate(ts) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ts));
}
const noon = (iso) => new Date(`${iso}T12:00:00Z`);
export function addDays(iso, n) {
  const d = noon(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const diffDays = (a, b) => Math.round((noon(b) - noon(a)) / 86400000);
export function isoWeekday(iso) {
  const d = noon(iso).getUTCDay();
  return d === 0 ? 7 : d;
}
export const weekStart = (iso) => addDays(iso, 1 - isoWeekday(iso));

export function fmtDate(iso, lang, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
  if (!iso) return '';
  return new Intl.DateTimeFormat(locale(lang), { ...opts, timeZone: 'UTC' }).format(noon(iso));
}
export function fmtDateTime(ts, lang) {
  if (!ts) return '';
  return new Intl.DateTimeFormat(locale(lang), {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: TZ,
  }).format(new Date(ts));
}
export function relTime(ts, lang) {
  const s = (new Date(ts) - new Date()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale(lang), { numeric: 'auto' });
  const a = Math.abs(s);
  if (a < 60) return rtf.format(Math.round(s), 'second');
  if (a < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (a < 86400) return rtf.format(Math.round(s / 3600), 'hour');
  if (a < 86400 * 7) return rtf.format(Math.round(s / 86400), 'day');
  return fmtDateTime(ts, lang);
}
export function weekdayName(n, lang, style = 'long') {
  // 2024-01-01 fue lunes
  return fmtDate(addDays('2024-01-01', n - 1), lang, { weekday: style });
}

// Estado de la fecha límite: overdue / today / tomorrow / week / later / none / done
export function dueState(t) {
  if (t.status === 'done') return 'done';
  if (!t.due_date) return 'none';
  const d = diffDays(todayISO(), t.due_date);
  if (d < 0) return 'overdue';
  if (d === 0) return t.due_time && t.due_time < nowHM() ? 'overdue' : 'today';
  if (d === 1) return 'tomorrow';
  if (d <= 6) return 'week';
  return 'later';
}

export const hoursBetween = (a, b) => (new Date(b) - new Date(a)) / 3600000;
export function median(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
export function fmtNum(n, lang, digits = 1) {
  return new Intl.NumberFormat(locale(lang), { maximumFractionDigits: digits }).format(n);
}

// ---------- orden de la cola (igual que en la base de datos) ----------
export function goesBefore(a, b) {
  const ad = a.due_date || null, bd = b.due_date || null;
  if (ad !== bd) return !!ad && (!bd || ad < bd);
  const at = a.due_time || null, bt = b.due_time || null;
  if (at !== bt) return !!at && (!bt || at < bt);
  return (a.priority || 2) > (b.priority || 2);
}
export const byPosition = (a, b) => a.position - b.position || String(a.created_at).localeCompare(String(b.created_at));

// Dónde entra un pendiente nuevo entre los pendientes "todo" de esa persona
export function autoPosition(tasks, assigneeId, f, excludeId) {
  const list = tasks
    .filter((t) => t.assignee_id === assigneeId && t.status === 'todo' && t.id !== excludeId)
    .sort(byPosition);
  let prev = null;
  for (const r of list) {
    if (goesBefore(f, r)) return prev === null ? r.position - 1 : (prev + r.position) / 2;
    prev = r.position;
  }
  return (prev ?? 0) + 1;
}

// Cola: primero "en curso", después pendientes por posición
export function queueOrder(list) {
  return list
    .filter((t) => t.status !== 'done')
    .sort((a, b) => (b.status === 'doing') - (a.status === 'doing') || byPosition(a, b));
}

// Posición nueva al soltar una tarjeta entre dos vecinas
export function positionBetween(before, after) {
  if (before && after) return (before.position + after.position) / 2;
  if (before) return before.position + 1;
  if (after) return after.position - 1;
  return 0;
}

// ---------- personas ----------
export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
export function firstName(name = '') {
  return name.trim().split(/\s+/)[0] || name;
}
// Tinta legible sobre un color (blanca u oscura)
export function inkOn(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return (1.05 / (L + 0.05)) >= ((L + 0.05) / 0.05) ? '#ffffff' : '#0b0b0b';
}
export function nextColor(used) {
  return PALETTE.find((c) => !used.includes(c)) || PALETTE[used.length % PALETTE.length];
}

// ---------- varios ----------
export function fmtBytes(n) {
  if (n == null) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
export function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}
export function safeFileName(name) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.\-]+/g, '_').slice(-120) || 'archivo';
}

// Link "Agregar a Google Calendar" para un pendiente
export function googleCalendarLink(t, detailUrl) {
  if (!t.due_date) return null;
  const d = t.due_date.replace(/-/g, '');
  let dates;
  if (t.due_time) {
    const [h, m] = t.due_time.split(':').map(Number);
    const end = new Date(Date.UTC(2000, 0, 1, h, m + 30));
    const endDay = end.getUTCDate() === 1 ? d : addDays(t.due_date, 1).replace(/-/g, '');
    const pad = (x) => String(x).padStart(2, '0');
    dates = `${d}T${pad(h)}${pad(m)}00/${endDay}T${pad(end.getUTCHours())}${pad(end.getUTCMinutes())}00`;
  } else {
    dates = `${d}/${addDays(t.due_date, 1).replace(/-/g, '')}`;
  }
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: t.title,
    dates,
    details: [t.client, t.detail, detailUrl].filter(Boolean).join('\n\n'),
    ctz: TZ,
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}
