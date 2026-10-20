// Crear: un pedido a Tomás o una tarea propia
import { html, useState, useRef } from '../deps.js';
import { useApp } from '../ctx.js';
import { cls, todayISO, addDays, isoWeekday, firstName, fmtDate } from '../util.js';
import { Icon, Segmented, Toggle, PeoplePicker, Modal, Avatar } from './ui.js';

export function NewTaskModal({ preset, onClose }) {
  const { t, me, profiles, receivers, api, reload, toast, lang, errorText } = useApp();
  const targets = receivers.filter((r) => r.id !== me.id);
  const [kind, setKind] = useState(targets.length && preset !== 'mine' ? 'request' : 'mine');
  const [assignee, setAssignee] = useState(targets[0]?.id);
  const [f, setF] = useState({ title: '', detail: '', client: '', due_date: '', due_time: '', priority: 2, is_private: false });
  const [shares, setShares] = useState(null);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef();
  const set = (k) => (e) => setF({ ...f, [k]: e?.target ? e.target.value : e });

  const others = profiles.filter((p) => p.active && p.id !== me.id && (kind === 'mine' || p.id !== assignee));
  // por defecto, las tareas de un banquero quedan compartidas con Tomás (para que pueda ayudar)
  const defaultShares = kind === 'mine' && !me.accepts_requests ? targets.map((r) => r.id) : [];
  const effShares = shares ?? defaultShares;
  const target = profiles.find((p) => p.id === assignee);

  const T = todayISO();
  const wd = isoWeekday(T);
  const quick = [
    { label: t('quick.today'), date: T },
    { label: t('quick.tomorrow'), date: addDays(T, 1) },
    { label: t('quick.friday'), date: addDays(T, wd <= 5 ? 5 - wd : 12 - wd) },
    { label: t('quick.nextMonday'), date: addDays(T, 8 - wd) },
  ];

  async function submit(e) {
    e?.preventDefault();
    if (!f.title.trim()) return toast(t('new.needTitle'), 'error');
    setBusy(true);
    try {
      const created = await api.createTask({
        ...f,
        priority: Number(f.priority),
        due_time: f.due_date ? f.due_time : '',
        assignee_id: kind === 'request' ? assignee : me.id,
        is_private: kind === 'mine' && f.is_private,
        shares: kind === 'mine' && f.is_private ? [] : effShares,
      });
      for (const file of files) await api.uploadAttachment(created.id, file, 'request');
      const data = await reload();
      if (kind === 'request') {
        const q = data?.queues?.[assignee] || [];
        const pos = q.find((i) => i.task_id === created.id)?.queue_pos;
        toast(pos ? t('new.sentPos', { name: firstName(target?.full_name), pos: t('ordinal', { n: pos }), total: q.length }) : t('new.sent'));
      } else toast(t('new.created'));
      onClose();
    } catch (err) {
      toast(errorText(err), 'error');
      setBusy(false);
    }
  }

  return html`<${Modal} title=${t('new.title')} onClose=${onClose} wide
    footer=${html`<button class="btn ghost" onClick=${onClose}>${t('cancel')}</button>
      <button class="btn primary" disabled=${busy} onClick=${submit}>
        <${Icon} name=${kind === 'request' ? 'send' : 'plus'} />${kind === 'request' ? t('new.send') : t('new.create')}</button>`}>
    <form class="new-form" onSubmit=${submit}>
      ${targets.length > 0 && html`<div class="kind-picker">
        <button type="button" class=${cls('kind', kind === 'request' && 'on')} onClick=${() => setKind('request')}>
          <span class="kind-icon"><${Icon} name="send" size=${18} /></span>
          <span><b>${t('new.kindRequest', { name: firstName(target?.full_name || targets[0].full_name) })}</b>
          <small>${t('new.kindRequestHint', { name: firstName(target?.full_name || targets[0].full_name) })}</small></span>
        </button>
        <button type="button" class=${cls('kind', kind === 'mine' && 'on')} onClick=${() => setKind('mine')}>
          <span class="kind-icon"><${Icon} name="check" size=${18} /></span>
          <span><b>${t('new.kindMine')}</b><small>${t('new.kindMineHint')}</small></span>
        </button>
      </div>`}

      ${kind === 'request' && targets.length > 1 && html`<div class="field">
        <span>${t('new.to')}</span>
        <div class="people-picker">
          ${targets.map((r) => html`<button type="button" key=${r.id} class=${cls('person-chip', assignee === r.id && 'on')} onClick=${() => setAssignee(r.id)}>
            <${Avatar} person=${r} size=${22} /><span>${r.full_name}</span></button>`)}
        </div>
      </div>`}

      <label class="field">
        <span>${t('field.title')} *</span>
        <input value=${f.title} onInput=${set('title')} placeholder=${kind === 'request' ? t('field.titlePhRequest') : t('field.titlePh')} maxlength="200" autofocus />
      </label>

      <div class="fields two">
        <label class="field">
          <span>${t('field.client')}</span>
          <input value=${f.client} onInput=${set('client')} placeholder=${t('field.clientPh')} maxlength="120" />
        </label>
        <div class="field">
          <span>${t('priority')}</span>
          <${Segmented} value=${Number(f.priority)} onChange=${set('priority')} options=${[3, 2, 1].map((v) => ({ value: v, label: t(`prio.${v}`), className: `seg-prio-${v}` }))} />
        </div>
      </div>

      <div class="field">
        <span>${t('dueDate')}</span>
        <div class="date-row">
          <input type="date" value=${f.due_date} onInput=${set('due_date')} />
          <input type="time" value=${f.due_time} onInput=${set('due_time')} disabled=${!f.due_date} aria-label=${t('field.time')} />
        </div>
        <div class="quick-dates">
          ${quick.map((q) => html`<button type="button" key=${q.label} class=${cls('chip-btn', f.due_date === q.date && 'on')}
            onClick=${() => setF({ ...f, due_date: f.due_date === q.date ? '' : q.date })}
            title=${fmtDate(q.date, lang, { weekday: 'long', day: 'numeric', month: 'long' })}>${q.label}</button>`)}
        </div>
      </div>

      <label class="field">
        <span>${t('field.detail')}</span>
        <textarea rows="4" value=${f.detail} onInput=${set('detail')} placeholder=${t('field.detailPh')}></textarea>
      </label>

      <div class="field">
        <span>${t('task.files')}</span>
        <input type="file" multiple hidden ref=${fileRef} onChange=${(e) => { setFiles([...files, ...e.target.files]); e.target.value = ''; }} />
        <div class="file-pills">
          ${files.map((file, i) => html`<span class="file-pill" key=${i}><${Icon} name="clip" size=${13} />${file.name}
            <button type="button" class="icon-btn sm" onClick=${() => setFiles(files.filter((_, j) => j !== i))} aria-label=${t('delete')}><${Icon} name="x" size=${12} /></button></span>`)}
          <button type="button" class="btn ghost sm" onClick=${() => fileRef.current.click()}><${Icon} name="upload" size=${14} />${t('task.addFile')}</button>
        </div>
      </div>

      <div class="visibility-box">
        <div class="vis-title"><${Icon} name="users" size=${15} />${t('task.visibility')}</div>
        ${kind === 'request'
          ? html`<p class="hint">${t('new.requestVisibility', { name: firstName(target?.full_name) })}</p>`
          : html`<${Toggle} checked=${f.is_private} onChange=${set('is_private')} label=${t('field.private')} hint=${t('field.privateHint')} />`}
        ${!(kind === 'mine' && f.is_private) && others.length > 0 && html`<div class="share-block">
          <div class="label">${kind === 'request' ? t('task.shareDetailToo') : t('task.shareWith')}</div>
          <${PeoplePicker} people=${others} value=${effShares} onChange=${setShares} />
          ${kind === 'mine' && me.accepts_requests && html`<p class="hint">${t('task.ownInQueue')}</p>`}
        </div>`}
      </div>
    </form>
  </${Modal}>`;
}
