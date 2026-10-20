// Tablero tipo Trello (Pendiente → En curso → Done) y la tira "Tus pedidos a Tomás"
import { html, useState, useMemo, useRef, useEffect, Sortable } from '../deps.js';
import { useApp } from '../ctx.js';
import {
  cls, isRequest, byPosition, queueOrder, positionBetween, dueState, firstName, tsToLocalDate, todayISO, addDays,
} from '../util.js';
import { Icon, Avatar, AvatarStack, Priority, DueChip, Segmented } from './ui.js';

export function Card({ task, num }) {
  const { t, me, byId, openTask } = useApp();
  const req = isRequest(task);
  const requester = byId[task.created_by];
  const assignee = byId[task.assignee_id];
  const sharedWith = (task.shares || []).map((id) => byId[id]).filter(Boolean);
  return html`<article class=${cls('card', req && 'is-request', task.status === 'done' && 'is-done')} data-id=${task.id}
    style=${req && requester ? `--who:${requester.color}` : ''} tabindex="0" role="button"
    aria-label=${task.title}
    onClick=${() => openTask(task.id)} onKeyDown=${(e) => e.key === 'Enter' && openTask(task.id)}>
    ${req && html`<div class="card-who">
      ${task.assignee_id === me.id
        ? html`<${Avatar} person=${requester} size=${18} /><span>${t('card.from', { name: requester?.full_name })}</span>`
        : html`<${Icon} name="arrow" size=${13} /><span>${t('card.to', { name: assignee?.full_name })}</span>`}
    </div>`}
    <div class="card-title">${task.title}</div>
    ${task.client && html`<div class="card-client"><${Icon} name="briefcase" size=${13} />${task.client}</div>`}
    <div class="card-foot">
      ${num && html`<span class="qnum" title=${t('card.queuePos')}>#${num}</span>`}
      <${Priority} value=${task.priority} compact />
      <${DueChip} task=${task} />
      <span class="grow"></span>
      ${task.is_private && html`<span class="meta" title=${t('privateHint')}><${Icon} name="lock" size=${13} /></span>`}
      ${task.recurring_id && html`<span class="meta" title=${t('recurring')}><${Icon} name="repeat" size=${13} /></span>`}
      ${task.comments_count > 0 && html`<span class="meta"><${Icon} name="message" size=${13} />${task.comments_count}</span>`}
      ${task.attachments_count > 0 && html`<span class="meta"><${Icon} name="clip" size=${13} />${task.attachments_count}</span>`}
      ${!req && sharedWith.length > 0 && html`<span title=${t('sharedWith') + ': ' + sharedWith.map((p) => p.full_name).join(', ')}><${AvatarStack} people=${sharedWith} size=${18} max=${3} /></span>`}
    </div>
  </article>`;
}

const COLS = ['todo', 'doing', 'done'];
const DONE_LIMIT = 12;

export function Kanban({ tasks, nums = {}, draggable = false, onMove, emptyHint }) {
  const { t } = useApp();
  const [allDone, setAllDone] = useState(false);
  const lists = useMemo(() => ({
    todo: tasks.filter((x) => x.status === 'todo').sort(byPosition),
    doing: tasks.filter((x) => x.status === 'doing').sort(byPosition),
    done: tasks.filter((x) => x.status === 'done')
      .sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at))),
  }), [tasks]);

  const refTodo = useRef(), refDoing = useRef(), refDone = useRef();
  const refs = { todo: refTodo, doing: refDoing, done: refDone };
  const latest = useRef({});
  latest.current = { lists, onMove };

  useEffect(() => {
    if (!draggable) return undefined;
    const group = `board-${Math.random().toString(36).slice(2)}`;
    const sortables = COLS.map((c) => Sortable.create(refs[c].current, {
      group, animation: 160, draggable: '.card', delay: 180, delayOnTouchOnly: true,
      forceFallback: true, fallbackOnBody: true, fallbackTolerance: 4,
      ghostClass: 'card-ghost', chosenClass: 'card-chosen', dragClass: 'card-drag', emptyInsertThreshold: 30,
      onEnd: (e) => {
        const { item, from, to, oldIndex, newIndex, newDraggableIndex } = e;
        if (from === to && oldIndex === newIndex) return;
        // devolvemos el DOM a como estaba y dejamos que Preact pinte el nuevo orden
        to.removeChild(item);
        from.insertBefore(item, from.children[oldIndex] || null);
        latest.current.onMove?.(item.dataset.id, to.dataset.status, newDraggableIndex, latest.current.lists);
      },
    }));
    return () => sortables.forEach((s) => s.destroy());
  }, [draggable]);

  return html`<div class="kanban">
    ${COLS.map((c) => {
      const items = c === 'done' && !allDone ? lists.done.slice(0, DONE_LIMIT) : lists[c];
      return html`<section class=${cls('col', `col-${c}`)} key=${c}>
        <header class="col-head">
          <span class="col-dot"></span>
          <span class="col-name">${t(`status.${c}`)}</span>
          <span class="col-count">${lists[c].length}</span>
        </header>
        <div class="col-list" data-status=${c} ref=${refs[c]}
          data-empty=${c === 'todo' ? (emptyHint || t('col.emptyTodo')) : c === 'doing' ? t('col.emptyDoing') : t('col.emptyDone')}>
          ${items.map((x) => html`<${Card} key=${x.id} task=${x} num=${nums[x.id]} />`)}
        </div>
        ${c === 'done' && lists.done.length > DONE_LIMIT && html`<button class="btn ghost sm col-more" onClick=${() => setAllDone(!allDone)}>
          ${allDone ? t('col.showLess') : t('col.showAll', { n: lists.done.length })}</button>`}
      </section>`;
    })}
  </div>`;
}

// Tira con los pedidos que yo hice (posición en la cola de Tomás)
function RequestsStrip({ requests }) {
  const { t, queues, receivers, openTask, openNew } = useApp();
  const receiver = receivers[0];
  const open = requests.filter((x) => x.status !== 'done')
    .map((x) => {
      const q = queues[x.assignee_id] || [];
      return { task: x, pos: q.find((i) => i.task_id === x.id)?.queue_pos, total: q.length };
    })
    .sort((a, b) => (a.pos ?? 999) - (b.pos ?? 999));
  const since = addDays(todayISO(), -4);
  const recentDone = requests.filter((x) => x.status === 'done' && x.completed_at && tsToLocalDate(x.completed_at) >= since)
    .sort((a, b) => b.completed_at.localeCompare(a.completed_at)).slice(0, 4);
  const name = receiver ? firstName(receiver.full_name) : '';

  return html`<section class="strip">
    <div class="strip-head">
      <h2>${t('strip.title', { name })}</h2>
      <span class="count-badge">${open.length}</span>
      <span class="grow"></span>
      <a class="link" href="#/queue">${t('strip.seeQueue', { name })} →</a>
    </div>
    <div class="strip-row">
      ${open.map(({ task, pos, total }) => html`<button class="req-card" key=${task.id} onClick=${() => openTask(task.id)}>
        <div class=${cls('req-pos', task.status === 'doing' && 'doing')}>
          ${task.status === 'doing'
            ? html`<${Icon} name="play" size=${18} /><small>${t('status.doing')}</small>`
            : html`<b>${pos ? t('ordinal', { n: pos }) : '–'}</b><small>${total ? t('strip.of', { n: total }) : ''}</small>`}
        </div>
        <div class="req-main">
          <div class="req-title">${task.title}</div>
          <div class="req-meta"><${Priority} value=${task.priority} compact /><${DueChip} task=${task} showNone /></div>
        </div>
      </button>`)}
      ${recentDone.map((task) => html`<button class="req-card is-done" key=${task.id} onClick=${() => openTask(task.id)}>
        <div class="req-pos done"><${Icon} name="check" size=${20} /><small>Done</small></div>
        <div class="req-main">
          <div class="req-title">${task.title}</div>
          <div class="req-meta"><${DueChip} task=${task} /></div>
        </div>
      </button>`)}
      ${receiver && html`<button class="req-card add" onClick=${() => openNew('request')}>
        <${Icon} name="plus" size=${18} /><span>${t('strip.ask', { name })}</span>
      </button>`}
    </div>
  </section>`;
}

export function BoardPage() {
  const { t, me, tasks, profiles, receivers, openNew, moveTask, openDone } = useApp();
  const [filter, setFilter] = useState('all');
  const [who, setWho] = useState(null);
  const isReceiver = me.accepts_requests;

  const mine = useMemo(() => tasks.filter((x) => x.assignee_id === me.id), [tasks, me.id]);
  const myRequests = useMemo(() => tasks.filter((x) => x.created_by === me.id && x.assignee_id !== me.id), [tasks, me.id]);
  // número en la cola: igual al que ven los demás (los privados no cuentan)
  const nums = useMemo(() => {
    const m = {};
    if (isReceiver) queueOrder(mine.filter((x) => !x.is_private)).forEach((x, i) => { m[x.id] = i + 1; });
    return m;
  }, [mine, isReceiver]);

  let shown = mine;
  if (filter === 'requests') shown = shown.filter(isRequest);
  if (filter === 'mine') shown = shown.filter((x) => !isRequest(x));
  if (who) shown = shown.filter((x) => x.created_by === who);

  const open = mine.filter((x) => x.status !== 'done');
  const urgent = open.filter((x) => ['overdue', 'today'].includes(dueState(x))).length;
  const reqOpen = open.filter(isRequest).length;
  const requesters = profiles.filter((p) => p.id !== me.id && mine.some((x) => x.created_by === p.id && x.status !== 'done'));

  async function handleMove(id, status, index, lists) {
    const task = tasks.find((x) => x.id === id);
    if (!task) return;
    const target = lists[status].filter((x) => x.id !== id);
    const patch = {};
    if (status !== 'done') patch.position = positionBetween(target[index - 1], target[index]);
    if (status !== task.status) patch.status = status;
    if (patch.status === 'done' && isRequest(task)) return openDone(task.id);
    if (!Object.keys(patch).length) return;
    await moveTask(id, patch);
  }

  return html`<div class="page">
    <div class="page-head">
      <div>
        <h1>${t('board.title')}</h1>
        <p class="sub">
          ${t('board.summary', { n: open.length })}
          ${isReceiver && reqOpen > 0 && html` · ${t('board.summaryReq', { n: reqOpen })}`}
          ${urgent > 0 && html` · <span class="text-critical">${t('board.summaryUrgent', { n: urgent })}</span>`}
        </p>
      </div>
    </div>

    ${!isReceiver && receivers.length > 0 && html`<${RequestsStrip} requests=${myRequests} />`}
    ${!isReceiver && html`<h2 class="section-title">${t('board.myTasks')}</h2>`}

    ${isReceiver && html`<div class="filters">
      <${Segmented} small value=${filter} onChange=${(v) => { setFilter(v); if (v === 'mine') setWho(null); }} options=${[
        { value: 'all', label: t('filter.all') },
        { value: 'requests', label: t('filter.requests') },
        { value: 'mine', label: t('filter.mine') },
      ]} />
      ${filter !== 'mine' && requesters.length > 0 && html`<div class="who-filter">
        ${requesters.map((p) => html`<button key=${p.id} class=${cls('who-btn', who === p.id && 'on')}
          onClick=${() => setWho(who === p.id ? null : p.id)} aria-pressed=${who === p.id} title=${p.full_name}>
          <${Avatar} person=${p} size=${26} />
        </button>`)}
        ${who && html`<button class="btn ghost sm" onClick=${() => setWho(null)}>${t('filter.clear')}</button>`}
      </div>`}
    </div>`}

    <${Kanban} tasks=${shown} nums=${nums} draggable onMove=${handleMove}
      emptyHint=${isReceiver ? t('col.emptyTodoReceiver') : t('col.emptyTodo')} />
  </div>`;
}
