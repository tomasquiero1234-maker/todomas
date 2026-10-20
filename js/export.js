// Exportar a Excel (.xlsx) con SheetJS, cargado solo al hacer clic
import { XLSX_ESM } from './deps.js';
import { isRequest, tsToLocalDate, hoursBetween, fmtNum, TZ } from './util.js';

const localDT = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
  return `${tsToLocalDate(ts)} ${time}`;
};

export function taskRows(tasks, { t, byId, lang }) {
  return tasks.map((x) => ({
    [t('xl.status')]: t(`status.${x.status}`),
    [t('xl.type')]: isRequest(x) ? t('xl.request') : t('xl.own'),
    [t('xl.title')]: x.title,
    [t('xl.client')]: x.client || '',
    [t('xl.requester')]: byId[x.created_by]?.full_name || '',
    [t('xl.assignee')]: byId[x.assignee_id]?.full_name || '',
    [t('xl.priority')]: t(`prio.${x.priority}`),
    [t('xl.due')]: x.due_date || '',
    [t('xl.dueTime')]: x.due_time || '',
    [t('xl.created')]: localDT(x.created_at),
    [t('xl.started')]: localDT(x.started_at),
    [t('xl.completed')]: localDT(x.completed_at),
    [t('xl.hours')]: x.completed_at ? Number(fmtNum(hoursBetween(x.created_at, x.completed_at), 'en', 1).replace(/,/g, '')) : '',
    [t('xl.onTime')]: x.completed_at && x.due_date ? (tsToLocalDate(x.completed_at) <= x.due_date ? t('yes') : t('no')) : '',
    [t('xl.private')]: x.is_private ? t('yes') : '',
    [t('xl.detail')]: x.detail || '',
    [t('xl.reply')]: x.done_note || '',
  }));
}

export async function exportXlsx(rows, filename, sheet = 'TODOmás') {
  const XLSX = await import(XLSX_ESM);
  const ws = XLSX.utils.json_to_sheet(rows);
  const keys = Object.keys(rows[0] || {});
  ws['!cols'] = keys.map((k) => ({
    wch: Math.min(60, Math.max(k.length, ...rows.slice(0, 300).map((r) => String(r[k] ?? '').length)) + 2),
  }));
  if (keys.length) ws['!autofilter'] = { ref: ws['!ref'] };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheet.slice(0, 31));
  XLSX.writeFile(wb, filename);
}
