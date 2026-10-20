// La cola de Tomás: todos ven que existe cada pedido y su lugar; el detalle, solo quien puede.
import { html, useRef, useEffect, useMemo, Sortable } from '../deps.js';
import { useApp } from '../ctx.js';
import { cls, diffDays, todayISO, firstName, positionBetween } from '../util.js';
import { Icon, Avatar, Priority, DueChip, StatusPill, Empty, Stat } from './ui.js';

export function QueuePage() {
  const { t, me, receivers, queues, byId, profiles, tasks, openTask, moveTask, route } = useApp();
  const receiverId = route.params.u || receivers[0]?.id;
  const receiver = byId[receiverId];
  const items = queues[receiverId] || [];
  const isOwner = me.id === receiverId;
  const listRef = useRef();
  const latest = useRef();
  latest.current = { items, tasks };

  // Tomás puede reordenar su cola arrastrando (solo los pendientes; "en curso" va siempre arriba)
  useEffect(() => {
    if (!isOwner || !listRef.current) return undefined;
    const s = Sortable.create(listRef.current, {
      animation: 160, draggable: '.q-row.st-todo', delay: 180, delayOnTouchOnly: true,
      forceFallback: true, fallbackOnBody: true, fallbackTolerance: 4,
      ghostClass: 'card-ghost', chosenClass: 'card-chosen',
      onEnd: (e) => {
        const { item, from, oldIndex, newIndex } = e;
        if (oldIndex === newIndex) return;
        from.removeChild(item);
        from.insertBefore(item, from.children[oldIndex] || null);
        const { items: its, tasks: ts } = latest.current;
        const todo = its.filter((i) => i.status === 'todo' && i.task_id !== item.dataset.id);
        const doingCount = its.filter((i) => i.status === 'doing').length;
        const idx = Math.max(0, newIndex - doingCount);
        const pos = (i) => i && ts.find((x) => x.id === i.task_id);
        moveTask(item.dataset.id, { position: positionBetween(pos(todo[idx - 1]), pos(todo[idx])) });
      },
    });
    return () => s.destroy();
  }, [isOwner, receiverId, items.length > 0]);

  const stats = useMemo(() => {
    const T = todayISO();
    const doing = items.filter((i) => i.status === 'doing').length;
    const week = items.filter((i) => i.due_date && diffDays(T, i.due_date) <= 6).length;
    const mine = items.filter((i) => i.is_request && i.requester_id === me.id);
    return { doing, week, mine, best: mine.length ? Math.min(...mine.map((i) => i.queue_pos)) : null };
  }, [items, me.id]);

  // ¿De quién es la cola? (color = persona, orden fijo de perfiles)
  const parts = useMemo(() => {
    const count = {};
    items.forEach((i) => { count[i.requester_id] = (count[i.requester_id] || 0) + 1; });
    return profiles.filter((p) => count[p.id]).map((p) => ({ person: p, n: count[p.id], self: p.id === receiverId }));
  }, [items, profiles, receiverId]);

  if (!receiver) {
    return html`<div class="page"><${Empty} icon="queue" title=${t('queue.noReceiver')} text=${t('queue.noReceiverText')} /></div>`;
  }
  const name = firstName(receiver.full_name);

  return html`<div class="page">
    <div class="page-head">
      <div>
        <h1>${isOwner ? t('queue.titleOwner') : t('queue.title', { name })}</h1>
        <p class="sub">${isOwner ? t('queue.subOwner') : t('queue.sub', { name })}</p>
      </div>
      ${receivers.length > 1 && html`<div class="head-actions">
        ${receivers.map((r) => html`<a key=${r.id} class=${cls('btn', r.id === receiverId ? 'primary' : 'ghost')} href=${`#/queue?u=${r.id}`}>${r.full_name}</a>`)}
      </div>`}
    </div>

    <div class="stats">
      <${Stat} label=${t('queue.statOpen')} value=${items.length} />
      <${Stat} label=${t('queue.statDoing')} value=${stats.doing} />
      <${Stat} label=${t('queue.statWeek')} value=${stats.week} />
      ${!isOwner && html`<${Stat} label=${t('queue.statMine')} value=${stats.mine.length}
        sub=${stats.best ? t('queue.statBest', { pos: t('ordinal', { n: stats.best }) }) : t('queue.statNone')} />`}
    </div>

    ${parts.length > 0 && html`<section class="card-panel">
      <div class="panel-title">${t('queue.whose')}</div>
      <div class="share-bar" role="img" aria-label=${parts.map((p) => `${p.person.full_name}: ${p.n}`).join(', ')}>
        ${parts.map((p) => html`<span key=${p.person.id} style=${`flex:${p.n};background:${p.person.color}`}
          title=${`${p.self ? t('queue.ownTasks', { name }) : p.person.full_name}: ${p.n}`}></span>`)}
      </div>
      <div class="legend">
        ${parts.map((p) => html`<span class="legend-item" key=${p.person.id}>
          <i style=${`background:${p.person.color}`}></i>${p.self ? t('queue.ownTasks', { name }) : p.person.full_name}
          <b>${p.n}</b></span>`)}
      </div>
    </section>`}

    ${items.length === 0
      ? html`<${Empty} icon="check" title=${t('queue.empty', { name })} text=${isOwner ? '' : t('queue.emptyText')} />`
      : html`<ol class="queue" ref=${listRef}>
        ${items.map((i) => {
          const who = byId[i.requester_id];
          const mine = i.is_request && i.requester_id === me.id;
          let title = i.title;
          if (!i.can_see) title = i.is_request ? t('queue.requestOf', { name: who?.full_name || '?' }) : t('queue.taskOf', { name });
          return html`<li key=${i.task_id} data-id=${i.task_id}
            class=${cls('q-row', `st-${i.status}`, mine && 'mine', !i.can_see && 'no-detail', isOwner && i.status === 'todo' && 'draggable')}
            onClick=${i.can_see ? () => openTask(i.task_id) : undefined} tabindex=${i.can_see ? 0 : -1}
            onKeyDown=${(e) => i.can_see && e.key === 'Enter' && openTask(i.task_id)}>
            <div class="q-pos">${i.queue_pos}</div>
            <${Avatar} person=${who} size=${34} />
            <div class="q-main">
              <div class="q-title">${title}</div>
              <div class="q-sub">
                ${!i.can_see && html`<span class="muted-inline"><${Icon} name="lock" size=${12} />${t('queue.hidden')}</span>`}
                ${i.can_see && i.is_request && html`<span>${mine ? t('queue.yours') : t('queue.by', { name: who?.full_name })}</span>`}
                ${i.can_see && !i.is_request && html`<span>${t('queue.ownTask')}</span>`}
                ${i.can_see && i.client && html`<span class="muted-inline"><${Icon} name="briefcase" size=${12} />${i.client}</span>`}
              </div>
            </div>
            <div class="q-meta">
              ${i.status === 'doing' && html`<${StatusPill} status="doing" />`}
              <${Priority} value=${i.priority} />
              <${DueChip} task=${i} showNone />
            </div>
          </li>`;
        })}
      </ol>`}
    ${isOwner && items.length > 1 && html`<p class="hint">${t('queue.dragHint')}</p>`}
  </div>`;
}
