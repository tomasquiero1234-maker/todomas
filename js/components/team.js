// Equipo: los tableros de los demás (solo lo que te compartieron)
import { html, useMemo } from '../deps.js';
import { useApp } from '../ctx.js';
import { cls, firstName } from '../util.js';
import { Avatar, Empty, Icon } from './ui.js';
import { Kanban, Card } from './board.js';

export function TeamPage() {
  const { t, me, profiles, tasks, route, navigate } = useApp();
  const others = profiles.filter((p) => p.active && p.id !== me.id);

  const counts = useMemo(() => {
    const c = {};
    for (const x of tasks) {
      if (x.created_by === x.assignee_id && x.assignee_id !== me.id && x.status !== 'done') c[x.assignee_id] = (c[x.assignee_id] || 0) + 1;
    }
    return c;
  }, [tasks, me.id]);

  const sel = route.params.u && others.some((p) => p.id === route.params.u)
    ? route.params.u
    : (others.find((p) => counts[p.id]) || others[0])?.id;
  const person = others.find((p) => p.id === sel);
  const theirs = tasks.filter((x) => x.assignee_id === sel && x.created_by === sel);
  const asked = me.accepts_requests ? tasks.filter((x) => x.created_by === sel && x.assignee_id === me.id && x.status !== 'done') : [];

  if (!others.length) {
    return html`<div class="page"><${Empty} icon="users" title=${t('team.alone')} text=${t('team.aloneText')} /></div>`;
  }

  return html`<div class="page">
    <div class="page-head">
      <div>
        <h1>${t('team.title')}</h1>
        <p class="sub">${t('team.sub')}</p>
      </div>
    </div>
    <div class="person-tabs" role="tablist">
      ${others.map((p) => html`<button key=${p.id} role="tab" aria-selected=${p.id === sel}
        class=${cls('person-tab', p.id === sel && 'on')} onClick=${() => navigate(`#/team?u=${p.id}`)}>
        <${Avatar} person=${p} size=${26} /><span>${p.full_name}</span>
        ${counts[p.id] > 0 && html`<span class="count-badge">${counts[p.id]}</span>`}
      </button>`)}
    </div>

    ${person && html`<div>
      ${asked.length > 0 && html`<section class="strip compact">
        <div class="strip-head"><h2>${t('team.askedYou', { name: firstName(person.full_name), n: asked.length })}</h2></div>
        <div class="mini-cards">${asked.map((x) => html`<${Card} key=${x.id} task=${x} />`)}</div>
      </section>`}
      <h2 class="section-title">${t('team.boardOf', { name: firstName(person.full_name) })}
        <span class="muted small"><${Icon} name="lock" size=${12} /> ${t('team.onlyShared')}</span></h2>
      ${theirs.length
        ? html`<${Kanban} tasks=${theirs} />`
        : html`<${Empty} icon="eyeoff" title=${t('team.nothingShared', { name: firstName(person.full_name) })} text=${t('team.nothingSharedText')} />`}
    </div>`}
  </div>`;
}

