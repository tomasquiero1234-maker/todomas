// Piezas visuales reutilizables
import { html, useEffect, useRef } from '../deps.js';
import { useApp } from '../ctx.js';
import { cls, initials, inkOn, dueState, fmtDate, diffDays, todayISO } from '../util.js';

const ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
  clip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  chart: '<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
  queue: '<path d="M10 6h11M10 12h11M10 18h11"/><path d="M4 6h1M4 12h1M4 18h1"/>',
  board: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18"/>',
  settings: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  eyeoff: '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  userplus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  table: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
};

export function Icon({ name, size = 16, className = '' }) {
  return html`<svg class=${cls('icon', className)} width=${size} height=${size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
    dangerouslySetInnerHTML=${{ __html: ICONS[name] || '' }}></svg>`;
}

export function Avatar({ person, size = 28, ring = false, title }) {
  if (!person) return null;
  const bg = person.color || '#8a94a6';
  return html`<span class=${cls('avatar', ring && 'ring')} title=${title ?? person.full_name}
    style=${`--size:${size}px;background:${bg};color:${inkOn(bg)};font-size:${Math.round(size * 0.4)}px`}>
    ${initials(person.full_name)}</span>`;
}

export function AvatarStack({ people, size = 22, max = 4 }) {
  const shown = people.slice(0, max);
  return html`<span class="avatar-stack">
    ${shown.map((p) => html`<${Avatar} key=${p.id} person=${p} size=${size} ring />`)}
    ${people.length > max && html`<span class="avatar more" style=${`--size:${size}px`}>+${people.length - max}</span>`}
  </span>`;
}

// Prioridad: barras (1 a 3) + texto, nunca solo color
export function Priority({ value, compact = false }) {
  const { t } = useApp();
  return html`<span class=${cls('prio', `prio-${value}`)} title=${t('priority') + ': ' + t(`prio.${value}`)}>
    <span class="bars" aria-hidden="true"><i></i><i></i><i></i></span>
    ${!compact && html`<span>${t(`prio.${value}`)}</span>`}
  </span>`;
}

export function DueChip({ task, showNone = false }) {
  const { t, lang } = useApp();
  if (task.status === 'done') {
    if (!task.completed_at) return null;
    return html`<span class="due done"><${Icon} name="check" size=${13} />${t('due.doneOn', { date: fmtDate(task.completed_at.slice(0, 10), lang, { day: 'numeric', month: 'short' }) })}</span>`;
  }
  const st = dueState(task);
  if (st === 'none') return showNone ? html`<span class="due none"><${Icon} name="calendar" size=${13} />${t('due.none')}</span>` : null;
  const time = task.due_time ? ` ${task.due_time}` : '';
  let label;
  if (st === 'overdue') {
    const d = -diffDays(todayISO(), task.due_date);
    label = d <= 0 ? t('due.lateToday', { time: task.due_time }) : t('due.overdue', { n: d });
  } else if (st === 'today') label = t('due.today') + time;
  else if (st === 'tomorrow') label = t('due.tomorrow') + time;
  else label = fmtDate(task.due_date, lang) + time;
  const icon = st === 'overdue' ? 'alert' : st === 'today' ? 'clock' : 'calendar';
  return html`<span class=${cls('due', st)} title=${t('dueDate') + ': ' + fmtDate(task.due_date, lang, { weekday: 'long', day: 'numeric', month: 'long' }) + time}>
    <${Icon} name=${icon} size=${13} />${label}</span>`;
}

export function StatusPill({ status }) {
  const { t } = useApp();
  return html`<span class=${cls('status-pill', `st-${status}`)}><i></i>${t(`status.${status}`)}</span>`;
}

export function Segmented({ value, options, onChange, disabled, small }) {
  return html`<div class=${cls('segmented', small && 'sm')} role="radiogroup">
    ${options.map((o) => html`<button type="button" role="radio" aria-checked=${value === o.value}
      class=${cls(value === o.value && 'on', o.className)} disabled=${disabled}
      onClick=${() => onChange(o.value)}>${o.icon && html`<${Icon} name=${o.icon} size=${14} />`}${o.label}</button>`)}
  </div>`;
}

export function Toggle({ checked, onChange, label, hint, disabled }) {
  return html`<label class=${cls('toggle', disabled && 'disabled')}>
    <input type="checkbox" checked=${checked} disabled=${disabled} onChange=${(e) => onChange(e.target.checked)} />
    <span class="track"><span class="thumb"></span></span>
    <span class="toggle-text"><span>${label}</span>${hint && html`<small>${hint}</small>`}</span>
  </label>`;
}

// Elegir personas (para compartir el detalle)
export function PeoplePicker({ people, value, onChange, disabled }) {
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return html`<div class="people-picker">
    ${people.map((p) => html`<button type="button" key=${p.id} disabled=${disabled}
      class=${cls('person-chip', value.includes(p.id) && 'on')} aria-pressed=${value.includes(p.id)}
      onClick=${() => toggle(p.id)}>
      <${Avatar} person=${p} size=${22} /><span>${p.full_name}</span>
      ${value.includes(p.id) && html`<${Icon} name="check" size=${14} />`}
    </button>`)}
  </div>`;
}

export function Modal({ title, onClose, children, wide, side, footer, label }) {
  const ref = useRef();
  useEffect(() => {
    const prev = document.activeElement;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    ref.current?.querySelector('[autofocus], input, textarea, button')?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
      prev?.focus?.({ preventScroll: true });
    };
  }, []);
  return html`<div class=${cls('overlay', side && 'side')} onMouseDown=${(e) => e.target === e.currentTarget && onClose()}>
    <div class=${cls('modal', wide && 'wide', side && 'side')} role="dialog" aria-modal="true" aria-label=${label || title} ref=${ref}>
      ${title !== undefined && html`<div class="modal-head">
        <div class="modal-title">${title}</div>
        <button class="icon-btn" onClick=${onClose} aria-label="Cerrar"><${Icon} name="x" size=${18} /></button>
      </div>`}
      <div class="modal-body">${children}</div>
      ${footer && html`<div class="modal-foot">${footer}</div>`}
    </div>
  </div>`;
}

export function Empty({ icon = 'inbox', title, text, action }) {
  return html`<div class="empty">
    <div class="empty-icon"><${Icon} name=${icon} size=${22} /></div>
    <div class="empty-title">${title}</div>
    ${text && html`<div class="empty-text">${text}</div>`}
    ${action}
  </div>`;
}

export function Stat({ label, value, sub, tone }) {
  return html`<div class=${cls('stat', tone && `tone-${tone}`)}>
    <div class="stat-label">${label}</div>
    <div class="stat-value">${value}</div>
    ${sub && html`<div class="stat-sub">${sub}</div>`}
  </div>`;
}
