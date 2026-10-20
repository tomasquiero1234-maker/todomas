// Usuarios (solo admin): invitar, ver quién entró, desactivar
import { html, useState, useEffect } from '../deps.js';
import { useApp } from '../ctx.js';
import { cls, nextColor, fmtDateTime } from '../util.js';
import { Icon, Avatar, Toggle, Segmented, Empty } from './ui.js';

export function AdminPage() {
  const { t, me, profiles, api, reload, toast, errorText, lang } = useApp();
  const [invites, setInvites] = useState([]);
  const [f, setF] = useState({ email: '', full_name: '', role: 'banker', accepts_requests: false });
  const [busy, setBusy] = useState(false);
  const load = () => api.listInvitations().then(setInvites).catch(() => setInvites([]));
  useEffect(() => { load(); }, []);

  if (me.role !== 'admin') return html`<div class="page"><${Empty} icon="lock" title=${t('admin.only')} /></div>`;

  const pending = invites.filter((i) => !i.accepted_at && !profiles.some((p) => p.email === i.email));
  const used = [...profiles.map((p) => p.color), ...pending.map((i) => i.color).filter(Boolean)];
  const appUrl = location.origin + location.pathname;

  async function invite(e) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) return toast(t('admin.badEmail'), 'error');
    if (!f.full_name.trim()) return toast(t('admin.needName'), 'error');
    setBusy(true);
    try {
      await api.invite({ ...f, full_name: f.full_name.trim(), color: nextColor(used) });
      setF({ email: '', full_name: '', role: 'banker', accepts_requests: false });
      await load();
      toast(t('admin.invited'));
    } catch (err) { toast(errorText(err), 'error'); }
    setBusy(false);
  }
  async function patchUser(p, patch) {
    try {
      await api.updateProfile(p.id, patch);
      await reload();
    } catch (err) { toast(errorText(err), 'error'); }
  }
  async function removeInvite(i) {
    if (!confirm(t('admin.confirmRemoveInvite', { email: i.email }))) return;
    await api.deleteInvitation(i.email);
    load();
  }
  const copyMsg = async () => {
    try {
      await navigator.clipboard.writeText(t('admin.inviteMsg', { url: appUrl }));
      toast(t('settings.copied'));
    } catch { /* */ }
  };

  return html`<div class="page narrow">
    <div class="page-head"><div><h1>${t('admin.title')}</h1><p class="sub">${t('admin.sub')}</p></div></div>

    <section class="card-panel">
      <div class="panel-title"><${Icon} name="userplus" size=${16} />${t('admin.invite')}</div>
      <form class="admin-form" onSubmit=${invite}>
        <div class="fields two">
          <label class="field"><span>${t('admin.email')}</span>
            <input type="email" value=${f.email} onInput=${(e) => setF({ ...f, email: e.target.value })} placeholder="nombre@empresa.com" /></label>
          <label class="field"><span>${t('settings.name')}</span>
            <input value=${f.full_name} onInput=${(e) => setF({ ...f, full_name: e.target.value })} placeholder="Karime" maxlength="60" /></label>
        </div>
        <div class="fields two">
          <div class="field"><span>${t('admin.role')}</span>
            <${Segmented} small value=${f.role} onChange=${(v) => setF({ ...f, role: v })} options=${[
              { value: 'banker', label: t('role.banker') }, { value: 'admin', label: t('role.admin') }]} /></div>
          <${Toggle} checked=${f.accepts_requests} onChange=${(v) => setF({ ...f, accepts_requests: v })}
            label=${t('admin.receives')} hint=${t('admin.receivesHint')} />
        </div>
        <div class="row-end"><button class="btn primary" disabled=${busy}><${Icon} name="userplus" />${t('admin.inviteBtn')}</button></div>
      </form>
      <div class="callout split">
        <div>${t('admin.howTo', { url: appUrl })}</div>
        <button class="btn ghost sm" onClick=${copyMsg}><${Icon} name="copy" size=${14} />${t('admin.copyMsg')}</button>
      </div>
    </section>

    ${pending.length > 0 && html`<section class="card-panel">
      <div class="panel-title">${t('admin.pending')} <span class="count-badge">${pending.length}</span></div>
      <ul class="user-list">
        ${pending.map((i) => html`<li key=${i.email}>
          <${Avatar} person=${{ full_name: i.full_name, color: i.color || '#8a94a6' }} size=${32} />
          <div class="grow"><b>${i.full_name}</b><div class="muted small">${i.email} · ${t('admin.invitedOn', { date: fmtDateTime(i.created_at, lang) })}</div></div>
          <span class="tag">${t(`role.${i.role}`)}</span>
          <button class="icon-btn sm" onClick=${() => removeInvite(i)} aria-label=${t('delete')}><${Icon} name="trash" size=${14} /></button>
        </li>`)}
      </ul>
    </section>`}

    <section class="card-panel">
      <div class="panel-title">${t('admin.users')} <span class="count-badge">${profiles.length}</span></div>
      <ul class="user-list">
        ${profiles.map((p) => html`<li key=${p.id} class=${cls(!p.active && 'off')}>
          <${Avatar} person=${p} size=${32} />
          <div class="grow"><b>${p.full_name}${p.id === me.id ? ` (${t('you')})` : ''}</b><div class="muted small">${p.email}</div></div>
          <span class="tag">${t(`role.${p.role}`)}</span>
          ${p.accepts_requests && html`<span class="tag good">${t('admin.receivesTag')}</span>`}
          ${p.id !== me.id && html`<${Toggle} checked=${p.active} onChange=${(v) => patchUser(p, { active: v })} label=${p.active ? t('admin.active') : t('admin.inactive')} />`}
        </li>`)}
      </ul>
    </section>
  </div>`;
}
