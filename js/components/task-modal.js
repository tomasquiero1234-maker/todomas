// Ficha de un pendiente: editar, compartir, adjuntos, comentarios y marcar Done
import { html, useState, useEffect, useRef } from '../deps.js';
import { useApp } from '../ctx.js';
import { cls, isRequest, fmtDateTime, relTime, fmtBytes, firstName, googleCalendarLink } from '../util.js';
import { Icon, Avatar, Priority, StatusPill, Segmented, Toggle, PeoplePicker, Modal, Empty } from './ui.js';

const pick = (x) => ({
  title: x.title || '', detail: x.detail || '', client: x.client || '',
  due_date: x.due_date || '', due_time: x.due_time || '', priority: x.priority || 2,
});

export function TaskModal({ id, onClose }) {
  const { t, me, tasks, byId, profiles, api, reload, toast, lang, openDone, queues, errorText } = useApp();
  const task = tasks.find((x) => x.id === id);
  const [form, setForm] = useState(task ? pick(task) : null);
  const [comments, setComments] = useState([]);
  const [atts, setAtts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const fileRef = useRef();

  useEffect(() => { if (task) setForm(pick(task)); }, [task?.updated_at]);
  const loadSide = async () => {
    const [c, a] = await Promise.all([api.listComments(id), api.listAttachments(id)]);
    setComments(c);
    setAtts(a);
  };
  useEffect(() => { if (task) loadSide(); }, [id, task?.comments_count, task?.attachments_count]);

  if (!task || !form) {
    return html`<${Modal} title="" onClose=${onClose} side>
      <${Empty} icon="eyeoff" title=${t('task.notFound')} text=${t('task.notFoundText')} />
    </${Modal}>`;
  }

  const req = isRequest(task);
  const isCreator = task.created_by === me.id;
  const isAssignee = task.assignee_id === me.id;
  const canEditContent = isCreator;
  const canEditDate = isCreator || isAssignee;
  const canStatus = isAssignee;
  const requester = byId[task.created_by];
  const assignee = byId[task.assignee_id];
  const dirty = Object.keys(form).some((k) => String(form[k] ?? '') !== String(pick(task)[k] ?? ''));
  const queuePos = (queues[task.assignee_id] || []).find((q) => q.task_id === task.id)?.queue_pos;
  const set = (k) => (e) => setForm({ ...form, [k]: e?.target ? e.target.value : e });

  async function run(fn, okMsg) {
    setBusy(true);
    try {
      await fn();
      await reload();
      if (okMsg) toast(okMsg);
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  const save = () => {
    if (!form.title.trim()) return toast(t('new.needTitle'), 'error');
    const patch = {};
    const base = pick(task);
    for (const k of Object.keys(form)) if (String(form[k] ?? '') !== String(base[k] ?? '')) patch[k] = form[k] === '' ? null : form[k];
    if ('priority' in patch) patch.priority = Number(patch.priority);
    if ('due_date' in patch && !patch.due_date) patch.due_time = null;
    return run(() => api.updateTask(id, patch), t('task.saved'));
  };

  const setStatus = (s) => {
    if (s === task.status) return;
    if (s === 'done' && req) return openDone(id);
    return run(() => api.updateTask(id, { status: s }));
  };

  const others = profiles.filter((p) => p.active && p.id !== me.id && p.id !== task.assignee_id);
  const setPrivate = (v) => run(() => api.updateTask(id, { is_private: v }));
  const setShares = (ids) => run(() => api.setShares(id, ids));

  async function upload(files) {
    if (!files?.length) return;
    await run(async () => {
      for (const f of files) await api.uploadAttachment(id, f, isAssignee && req ? 'response' : 'request');
    }, t('task.uploaded'));
    loadSide();
  }
  async function download(a) {
    try {
      const url = await api.attachmentUrl(a);
      if (!url) return;
      const link = document.createElement('a');
      link.href = url;
      link.download = a.file_name;
      link.target = '_blank';
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) { toast(errorText(e), 'error'); }
  }
  async function removeAtt(a) {
    if (!confirm(t('task.confirmDeleteFile', { name: a.file_name }))) return;
    await run(() => api.deleteAttachment(a));
    loadSide();
  }
  async function send() {
    if (!draft.trim()) return;
    const body = draft;
    setDraft('');
    await run(() => api.addComment(id, body));
    loadSide();
  }
  async function remove() {
    const msg = req && task.status !== 'done' ? t('task.confirmCancel', { name: assignee?.full_name }) : t('task.confirmDelete');
    if (!confirm(msg)) return;
    await run(() => api.deleteTask(id), req ? t('task.cancelled') : t('task.deleted'));
    onClose();
  }

  const visibleTo = [requester, assignee, ...task.shares.map((u) => byId[u])]
    .filter((p, i, arr) => p && arr.findIndex((q) => q?.id === p.id) === i);
  const gcal = googleCalendarLink(task, `${location.origin}${location.pathname}#/board?task=${task.id}`);

  const head = html`<div class="task-kind">
    ${req
      ? html`<${Avatar} person=${requester} size=${22} /><span>${t('task.requestFromTo', { from: requester?.full_name, to: assignee?.full_name })}</span>`
      : html`<${Icon} name=${task.is_private ? 'lock' : 'check'} size=${15} /><span>${task.is_private ? t('task.privateKind') : isCreator ? t('task.yourTask') : t('task.personalKind', { name: requester?.full_name })}</span>`}
    ${task.recurring_id && html`<span class="tag"><${Icon} name="repeat" size=${12} />${t('recurring')}</span>`}
  </div>`;

  return html`<${Modal} title=${head} onClose=${onClose} side label=${task.title}>
    <div class="task">
      <div class="task-status">
        ${canStatus
          ? html`<${Segmented} value=${task.status} disabled=${busy} onChange=${setStatus} options=${[
              { value: 'todo', label: t('status.todo'), className: 'seg-todo' },
              { value: 'doing', label: t('status.doing'), className: 'seg-doing' },
              { value: 'done', label: t('status.done'), icon: 'check', className: 'seg-done' },
            ]} />`
          : html`<${StatusPill} status=${task.status} />
            <span class="muted">${task.status !== 'done' && queuePos ? t('task.queuePos', { pos: t('ordinal', { n: queuePos }), name: firstName(assignee?.full_name) }) : ''}
              ${req && task.status !== 'done' ? ' · ' + t('task.onlyAssigneeMoves', { name: firstName(assignee?.full_name) }) : ''}</span>`}
      </div>

      ${canEditContent
        ? html`<textarea class="title-input" rows="1" value=${form.title} onInput=${set('title')} maxlength="200"
            aria-label=${t('field.title')} onKeyDown=${(e) => e.key === 'Enter' && e.preventDefault()}></textarea>`
        : html`<h2 class="task-title">${task.title}</h2>`}

      <div class="fields two">
        <label class="field">
          <span>${t('field.client')}</span>
          ${canEditContent
            ? html`<input value=${form.client} onInput=${set('client')} placeholder=${t('field.clientPh')} maxlength="120" />`
            : html`<div class="field-ro">${task.client || '—'}</div>`}
        </label>
        <div class="field">
          <span>${t('priority')}</span>
          ${canEditContent
            ? html`<${Segmented} small value=${Number(form.priority)} onChange=${set('priority')} options=${[3, 2, 1].map((v) => ({ value: v, label: t(`prio.${v}`) }))} />`
            : html`<div class="field-ro"><${Priority} value=${task.priority} /></div>`}
        </div>
      </div>
      <div class="field">
        <span>${t('dueDate')}</span>
          ${canEditDate
            ? html`<div class="date-row">
                <input type="date" value=${form.due_date} onInput=${set('due_date')} />
                <input type="time" value=${form.due_time} onInput=${set('due_time')} disabled=${!form.due_date} aria-label=${t('field.time')} />
              </div>`
            : html`<div class="field-ro">${task.due_date ? `${new Date(task.due_date + 'T12:00:00Z').toLocaleDateString(lang === 'en' ? 'en-US' : 'es-CL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}${task.due_time ? ' · ' + task.due_time : ''}` : t('due.none')}</div>`}
      </div>
      <label class="field">
        <span>${t('field.detail')}</span>
        ${canEditContent
          ? html`<textarea rows="4" value=${form.detail} onInput=${set('detail')} placeholder=${t('field.detailPh')}></textarea>`
          : html`<div class="field-ro prewrap">${task.detail || '—'}</div>`}
      </label>

      ${dirty && html`<div class="savebar">
        <span>${t('task.unsaved')}</span>
        <button class="btn ghost sm" onClick=${() => setForm(pick(task))}>${t('discard')}</button>
        <button class="btn primary sm" disabled=${busy} onClick=${save}>${t('save')}</button>
      </div>`}

      ${task.done_note && html`<div class="callout good">
        <div class="callout-title"><${Icon} name="check" size=${15} />${t('task.doneNote', { name: firstName(assignee?.full_name) })}</div>
        <div class="prewrap">${task.done_note}</div>
      </div>`}

      <section class="task-section">
        <h3><${Icon} name="users" size=${15} />${t('task.visibility')}</h3>
        ${req && html`<p class="hint">${t('task.requestVisibility', { name: firstName(assignee?.full_name) })}</p>`}
        ${!req && isCreator && html`<${Toggle} checked=${task.is_private} disabled=${busy} onChange=${setPrivate}
            label=${t('field.private')} hint=${t('field.privateHint')} />`}
        ${isCreator && !task.is_private && others.length > 0 && html`<div class="share-block">
          <div class="label">${req ? t('task.shareDetailToo') : t('task.shareWith')}</div>
          <${PeoplePicker} people=${others} value=${task.shares} onChange=${setShares} disabled=${busy} />
        </div>`}
        ${!isCreator && html`<div class="seen-by">
          <span class="label">${t('task.seenBy')}</span>
          ${visibleTo.map((p) => html`<span class="seen-chip" key=${p.id}><${Avatar} person=${p} size=${20} />${p.id === me.id ? t('you') : p.full_name}</span>`)}
        </div>`}
        ${!req && !task.is_private && isAssignee && me.accepts_requests && html`<p class="hint">${t('task.ownInQueue')}</p>`}
      </section>

      <section class="task-section">
        <h3><${Icon} name="clip" size=${15} />${t('task.files')} ${atts.length > 0 && html`<span class="count-badge">${atts.length}</span>`}</h3>
        ${atts.length > 0 && html`<ul class="files">
          ${atts.map((a) => html`<li key=${a.id}>
            <button class="file-link" onClick=${() => download(a)}><${Icon} name="download" size=${14} />${a.file_name}</button>
            ${a.kind === 'response' && html`<span class="tag good">${t('task.responseFile')}</span>`}
            <span class="muted">${fmtBytes(a.size_bytes)} · ${byId[a.uploaded_by]?.full_name || ''}</span>
            ${a.uploaded_by === me.id && html`<button class="icon-btn sm" onClick=${() => removeAtt(a)} aria-label=${t('delete')}><${Icon} name="trash" size=${14} /></button>`}
          </li>`)}
        </ul>`}
        ${(isCreator || isAssignee) && html`<div>
          <input type="file" multiple hidden ref=${fileRef} onChange=${(e) => { upload([...e.target.files]); e.target.value = ''; }} />
          <button class="btn ghost sm" disabled=${busy} onClick=${() => fileRef.current.click()}><${Icon} name="upload" size=${14} />${t('task.addFile')}</button>
        </div>`}
        ${!atts.length && !(isCreator || isAssignee) && html`<p class="hint">${t('task.noFiles')}</p>`}
      </section>

      <section class="task-section">
        <h3><${Icon} name="message" size=${15} />${t('task.comments')} ${comments.length > 0 && html`<span class="count-badge">${comments.length}</span>`}</h3>
        <ul class="comments">
          ${comments.map((c) => {
            const a = byId[c.author_id];
            return html`<li key=${c.id} class=${cls(c.author_id === me.id && 'mine')}>
              <${Avatar} person=${a} size=${26} />
              <div class="bubble">
                <div class="bubble-head"><b>${c.author_id === me.id ? t('you') : a?.full_name}</b><span title=${fmtDateTime(c.created_at, lang)}>${relTime(c.created_at, lang)}</span></div>
                <div class="prewrap">${c.body}</div>
              </div>
            </li>`;
          })}
        </ul>
        <div class="comment-box">
          <textarea rows="2" placeholder=${t('task.commentPh')} value=${draft} onInput=${(e) => setDraft(e.target.value)}
            onKeyDown=${(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(); }}></textarea>
          <button class="btn primary sm" disabled=${!draft.trim() || busy} onClick=${send}><${Icon} name="send" size=${14} />${t('send')}</button>
        </div>
      </section>

      <div class="task-foot">
        <div class="muted">
          ${t('task.createdBy', { name: requester?.full_name, date: fmtDateTime(task.created_at, lang) })}
          ${task.completed_at && html`<br />${t('task.completedAt', { date: fmtDateTime(task.completed_at, lang) })}`}
        </div>
        <div class="foot-actions">
          ${gcal && html`<a class="btn ghost sm" href=${gcal} target="_blank" rel="noopener"><${Icon} name="calendar" size=${14} />${t('task.addToCalendar')}</a>`}
          ${isCreator && html`<button class="btn danger-ghost sm" disabled=${busy} onClick=${remove}><${Icon} name="trash" size=${14} />${req && task.status !== 'done' ? t('task.cancelRequest') : t('delete')}</button>`}
        </div>
      </div>
    </div>
  </${Modal}>`;
}

// Cerrar un pedido: nota opcional + archivos opcionales → aviso al banquero
export function DoneDialog({ id, onClose }) {
  const { t, tasks, byId, api, reload, toast, errorText } = useApp();
  const task = tasks.find((x) => x.id === id);
  const [note, setNote] = useState(task?.done_note || '');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef();
  if (!task) return null;
  const requester = byId[task.created_by];

  async function confirmDone() {
    setBusy(true);
    try {
      for (const f of files) await api.uploadAttachment(id, f, 'response');
      await api.updateTask(id, { status: 'done', done_note: note.trim() || null });
      await reload();
      toast(t('done.toast', { name: firstName(requester?.full_name) }));
      onClose();
    } catch (e) {
      toast(errorText(e), 'error');
      setBusy(false);
    }
  }

  return html`<${Modal} title=${t('done.title')} onClose=${onClose}
    footer=${html`<button class="btn ghost" onClick=${onClose}>${t('cancel')}</button>
      <button class="btn good" disabled=${busy} onClick=${confirmDone}><${Icon} name="check" />${t('done.confirm')}</button>`}>
    <div class="done-dialog">
      <div class="done-task"><b>${task.title}</b><span class="muted">${t('task.requestFrom', { name: requester?.full_name })}</span></div>
      <p class="hint"><${Icon} name="mail" size=${14} /> ${t('done.willNotify', { name: firstName(requester?.full_name) })}</p>
      <label class="field">
        <span>${t('done.note')}</span>
        <textarea rows="3" value=${note} onInput=${(e) => setNote(e.target.value)} placeholder=${t('done.notePh')} autofocus></textarea>
      </label>
      <div class="field">
        <span>${t('done.files')}</span>
        <input type="file" multiple hidden ref=${fileRef} onChange=${(e) => { setFiles([...files, ...e.target.files]); e.target.value = ''; }} />
        <div class="file-pills">
          ${files.map((f, i) => html`<span class="file-pill" key=${i}><${Icon} name="clip" size=${13} />${f.name}
            <button class="icon-btn sm" onClick=${() => setFiles(files.filter((_, j) => j !== i))} aria-label=${t('delete')}><${Icon} name="x" size=${12} /></button></span>`)}
          <button class="btn ghost sm" onClick=${() => fileRef.current.click()}><${Icon} name="upload" size=${14} />${t('task.addFile')}</button>
        </div>
      </div>
    </div>
  </${Modal}>`;
}
