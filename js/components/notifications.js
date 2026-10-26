// Campana de avisos
import { html, useState, useEffect, useRef } from '../deps.js';
import { useApp } from '../ctx.js';
import { cls, relTime, fmtDate } from '../util.js';
import { Icon, Avatar } from './ui.js';

const ICON = { new_request: 'inbox', done: 'check', date_changed: 'calendar', cancelled: 'x', comment: 'message', due_soon: 'clock', digest: 'sun', reset_request: 'lock' };

export function notifText(n, { t, byId, lang }) {
  const actor = byId[n.actor_id]?.full_name || '';
  const p = n.payload || {};
  const title = p.title || '';
  switch (n.type) {
    case 'new_request': return t('notif.new_request', { actor, title });
    case 'done': return t('notif.done', { actor, title });
    case 'date_changed': return t('notif.date_changed', { actor, title, date: p.due_date ? fmtDate(p.due_date, lang) : t('due.none') });
    case 'cancelled': return t('notif.cancelled', { actor, title });
    case 'comment': return t('notif.comment', { actor, title, comment: p.comment || '' });
    case 'due_soon': return t('notif.due_soon', { n: p.count ?? (p.items || []).length });
    case 'digest': return t('notif.digest', { n: p.open ?? 0 });
    case 'reset_request': return t('notif.reset_request', { actor: actor || p.name || '' });
    default: return title;
  }
}

export function Bell() {
  const app = useApp();
  const { t, notifications, byId, lang, api, reload, openTask, navigate } = app;
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const unread = notifications.filter((n) => !n.read_at);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  async function click(n) {
    setOpen(false);
    if (!n.read_at) { await api.markRead([n.id]); reload(); }
    if (n.task_id) openTask(n.task_id);
    else if (n.type === 'digest') navigate('#/queue');
    else if (n.type === 'reset_request') navigate('#/admin');
    else if (n.type === 'due_soon') navigate('#/board');
  }
  async function readAll() {
    await api.markAllRead();
    reload();
  }

  return html`<div class="bell" ref=${ref}>
    <button class=${cls('icon-btn', open && 'on')} onClick=${() => setOpen(!open)} aria-label=${t('notif.title')} aria-expanded=${open}>
      <${Icon} name="bell" size=${19} />
      ${unread.length > 0 && html`<span class="bell-badge">${unread.length > 9 ? '9+' : unread.length}</span>`}
    </button>
    ${open && html`<div class="dropdown notif-panel">
      <div class="dropdown-head">
        <b>${t('notif.title')}</b>
        ${unread.length > 0 && html`<button class="link-btn" onClick=${readAll}>${t('notif.readAll')}</button>`}
      </div>
      ${notifications.length === 0
        ? html`<div class="notif-empty">${t('notif.empty')}</div>`
        : html`<ul class="notif-list">
          ${notifications.slice(0, 30).map((n) => html`<li key=${n.id}>
            <button class=${cls('notif', !n.read_at && 'unread', `n-${n.type}`)} onClick=${() => click(n)}>
              <span class="notif-icon">${byId[n.actor_id]
                ? html`<${Avatar} person=${byId[n.actor_id]} size=${30} />`
                : html`<span class="sys-icon"><${Icon} name=${ICON[n.type] || 'bell'} size=${15} /></span>`}
                ${byId[n.actor_id] && html`<span class="badge-icon"><${Icon} name=${ICON[n.type] || 'bell'} size=${10} /></span>`}
              </span>
              <span class="notif-body">
                <span class="notif-text">${notifText(n, app)}</span>
                <span class="notif-time">${relTime(n.created_at, lang)}</span>
              </span>
            </button>
          </li>`)}
        </ul>`}
    </div>`}
  </div>`;
}
