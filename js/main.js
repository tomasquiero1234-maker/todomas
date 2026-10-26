// TODOmás · arranque, sesión, navegación y estado global
import { html, render, useState, useEffect, useMemo, useCallback, useRef } from './deps.js';
import { AppCtx } from './ctx.js';
import { getApi } from './api/index.js';
import { makeT, detectLang, saveLang } from './i18n.js';
import { cls, debounce, firstName } from './util.js';
import { Icon, Avatar, Empty } from './components/ui.js';
import { LoginScreen, NewPasswordScreen, Brand } from './components/login.js';
import { BoardPage } from './components/board.js';
import { QueuePage } from './components/queue.js';
import { TeamPage } from './components/team.js';
import { MetricsPage } from './components/metrics.js';
import { SettingsPage } from './components/settings.js';
import { AdminPage } from './components/admin.js';
import { Bell } from './components/notifications.js';
import { TaskModal, DoneDialog } from './components/task-modal.js';
import { NewTaskModal } from './components/new-task.js';

function parseHash() {
  const h = location.hash || '#/board';
  if (/access_token=|error_description=|type=recovery/.test(h)) return { path: '/board', params: {} };
  const [p, q] = h.slice(1).split('?');
  return { path: p && p.startsWith('/') ? p : '/board', params: Object.fromEntries(new URLSearchParams(q || '')) };
}

const errorTextFor = (t) => (e) => {
  const code = e?.code || e?.message || '';
  const key = `error.${code}`;
  const txt = t(key);
  if (txt !== key) return txt;
  return e?.message && !/^TODOMAS_/.test(e.message) && e.message.length < 160 ? e.message : t('error.generic');
};

function Splash() {
  return html`<div class="splash"><span class="brand-mark lg"></span></div>`;
}

function UserMenu({ me, t, api, navigate, setLang, lang }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const go = (h) => { setOpen(false); navigate(h); };
  return html`<div class="user-menu" ref=${ref}>
    <button class="avatar-btn" onClick=${() => setOpen(!open)} aria-label=${t('nav.account')} aria-expanded=${open}>
      <${Avatar} person=${me} size=${32} />
    </button>
    ${open && html`<div class="dropdown menu">
      <div class="menu-who"><b>${me.full_name}</b><small>${me.email}</small></div>
      <button onClick=${() => go('#/settings')}><${Icon} name="settings" />${t('nav.settings')}</button>
      ${me.role === 'admin' && html`<button onClick=${() => go('#/admin')}><${Icon} name="userplus" />${t('nav.admin')}</button>`}
      <button onClick=${() => { setLang(lang === 'es' ? 'en' : 'es'); setOpen(false); }}><${Icon} name="globe" />${lang === 'es' ? 'English' : 'Español'}</button>
      <hr />
      <button onClick=${() => api.signOut()}><${Icon} name="logout" />${api.mode === 'demo' ? t('demo.switch') : t('nav.signOut')}</button>
    </div>`}
  </div>`;
}

function App({ api, lang, setLang }) {
  const [data, setData] = useState({ me: null, profiles: [], tasks: [], notifications: [], queues: {}, settings: { emails_enabled: true }, loaded: false, error: null });
  const [route, setRoute] = useState(parseHash);
  const [modal, setModal] = useState(null);
  const [toasts, setToasts] = useState([]);
  const t = useMemo(() => makeT(lang), [lang]);
  const errorText = useMemo(() => errorTextFor(t), [t]);

  const reload = useCallback(async () => {
    try {
      const me = await api.getMe();
      if (!me || !me.active) {
        setData((d) => ({ ...d, me, loaded: true }));
        return null;
      }
      const [profiles, tasks, notifications, settings] = await Promise.all([api.listProfiles(), api.listTasks(), api.listNotifications(), api.getAppSettings()]);
      const receivers = profiles.filter((p) => p.active && p.accepts_requests);
      const qs = await Promise.all(receivers.map((r) => api.getQueue(r.id)));
      const next = { me, profiles, tasks, notifications, settings, queues: Object.fromEntries(receivers.map((r, i) => [r.id, qs[i]])), loaded: true, error: null };
      setData(next);
      return next;
    } catch (e) {
      console.error(e);
      setData((d) => ({ ...d, loaded: true, error: e }));
      return null;
    }
  }, [api]);

  useEffect(() => { reload(); }, []);
  useEffect(() => { if (data.me?.lang && data.me.lang !== lang) setLang(data.me.lang); }, [data.me?.lang]);

  // tiempo real + refresco al volver a la pestaña + cada minuto
  useEffect(() => {
    const soon = debounce(reload, 350);
    const off = api.subscribe(soon);
    const onVis = () => document.visibilityState === 'visible' && reload();
    document.addEventListener('visibilitychange', onVis);
    const iv = setInterval(() => document.visibilityState === 'visible' && reload(), 60000);
    return () => { off?.(); document.removeEventListener('visibilitychange', onVis); clearInterval(iv); };
  }, []);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  // ?task=ID en el link (por ejemplo desde un email) abre la ficha
  useEffect(() => {
    if (data.loaded && route.params.task) setModal({ type: 'task', id: route.params.task });
  }, [data.loaded, route.params.task]);

  const toast = useCallback((msg, kind = 'ok') => {
    const id = Math.random();
    setToasts((ts) => [...ts, { id, msg, kind }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), kind === 'error' ? 6000 : 3800);
  }, []);

  const closeModal = () => {
    setModal(null);
    if (route.params.task) history.replaceState(null, '', `#${route.path}`);
    if (route.params.task) setRoute({ ...route, params: { ...route.params, task: undefined } });
  };

  const moveTask = useCallback(async (id, patch) => {
    setData((d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === id ? { ...x, ...patch, ...(patch.status === 'done' ? { completed_at: new Date().toISOString() } : {}) } : x)) }));
    try {
      await api.updateTask(id, patch);
    } catch (e) {
      toast(errorText(e), 'error');
    }
    reload();
  }, [api, errorText]);

  const unread = data.notifications.filter((n) => !n.read_at).length;
  useEffect(() => { document.title = unread ? `(${unread}) TODOmás` : 'TODOmás'; }, [unread]);

  if (!data.loaded) return html`<${Splash} />`;
  const { me } = data;
  if (!me || !me.active) {
    return html`<div class="auth"><div class="auth-card">
      <${Brand} big />
      <${Empty} icon="lock" title=${!me ? t('auth.noProfile') : t('auth.inactive')} text=${!me ? t('auth.noProfileText') : t('auth.inactiveText')} />
      <button class="btn ghost block" onClick=${() => api.signOut()}>${t('nav.signOut')}</button>
    </div></div>`;
  }

  const byId = Object.fromEntries(data.profiles.map((p) => [p.id, p]));
  const receivers = data.profiles.filter((p) => p.active && p.accepts_requests);
  const navigate = (h) => { location.hash = h; };
  const ctx = {
    api, t, lang, me, ...data, byId, receivers, route, reload, toast, errorText, navigate, moveTask,
    openTask: (id) => setModal({ type: 'task', id }),
    openNew: (preset) => setModal({ type: 'new', preset }),
    openDone: (id) => setModal({ type: 'done', id }),
  };

  const receiverName = receivers[0] ? firstName(receivers[0].full_name) : '';
  const nav = [
    { path: '/board', icon: 'board', label: t('nav.board') },
    receivers.length > 0 && { path: '/queue', icon: 'queue', label: me.accepts_requests ? t('nav.myQueue') : t('nav.queue', { name: receiverName }) },
    { path: '/team', icon: 'users', label: t('nav.team') },
    me.accepts_requests && { path: '/metrics', icon: 'chart', label: t('nav.metrics') },
  ].filter(Boolean);

  let page;
  switch (route.path) {
    case '/queue': page = html`<${QueuePage} />`; break;
    case '/team': page = html`<${TeamPage} />`; break;
    case '/metrics': page = me.accepts_requests ? html`<${MetricsPage} />` : html`<${BoardPage} />`; break;
    case '/settings': page = html`<${SettingsPage} />`; break;
    case '/admin': page = html`<${AdminPage} />`; break;
    default: page = html`<${BoardPage} />`;
  }
  const newLabel = me.accepts_requests || !receivers.length ? t('new.task') : t('new.request', { name: receiverName });

  return html`<${AppCtx.Provider} value=${ctx}>
    ${api.mode === 'demo' && html`<div class="demo-bar">
      <span><b>${t('demo.badge')}</b> ${t('demo.viewingAs', { name: me.full_name })}</span>
      <button class="link-btn" onClick=${() => api.signOut()}>${t('demo.switch')}</button>
      <button class="link-btn" onClick=${() => { if (confirm(t('demo.resetConfirm'))) { api.resetDemo(); reload(); } }}>${t('demo.reset')}</button>
    </div>`}
    <header class="topbar">
      <a class="brand-link" href="#/board" aria-label="TODOmás"><${Brand} /></a>
      <nav class="nav">
        ${nav.map((n) => html`<a key=${n.path} href=${`#${n.path}`} class=${cls('nav-link', route.path === n.path && 'on')}>
          <${Icon} name=${n.icon} size=${16} />${n.label}</a>`)}
      </nav>
      <div class="top-actions">
        <button class="btn primary new-btn" onClick=${() => ctx.openNew(me.accepts_requests ? 'mine' : 'request')} title=${newLabel}>
          <${Icon} name="plus" /><span class="new-label">${newLabel}</span></button>
        <${Bell} />
        <${UserMenu} me=${me} t=${t} api=${api} navigate=${navigate} setLang=${(l) => api.updateProfile(me.id, { lang: l }).then(reload)} lang=${lang} />
      </div>
    </header>
    <main>${data.error && html`<div class="page"><div class="callout error">${t('error.load')} <button class="link-btn" onClick=${reload}>${t('retry')}</button></div></div>`}${page}</main>
    <nav class="bottom-nav">
      ${nav.map((n) => html`<a key=${n.path} href=${`#${n.path}`} class=${cls(route.path === n.path && 'on')}>
        <${Icon} name=${n.icon} size=${20} /><span>${n.label}</span></a>`)}
    </nav>
    ${modal?.type === 'task' && html`<${TaskModal} key=${modal.id} id=${modal.id} onClose=${closeModal} />`}
    ${modal?.type === 'new' && html`<${NewTaskModal} preset=${modal.preset} onClose=${closeModal} />`}
    ${modal?.type === 'done' && html`<${DoneDialog} id=${modal.id} onClose=${closeModal} />`}
    <div class="toasts" role="status" aria-live="polite">
      ${toasts.map((x) => html`<div key=${x.id} class=${cls('toast', x.kind)}><${Icon} name=${x.kind === 'error' ? 'alert' : 'check'} size=${16} />${x.msg}</div>`)}
    </div>
  </${AppCtx.Provider}>`;
}

function Root({ api }) {
  const [lang, setLangState] = useState(detectLang);
  const setLang = (l) => { setLangState(l); saveLang(l); };
  const t = useMemo(() => makeT(lang), [lang]);
  const errorText = useMemo(() => errorTextFor(t), [t]);
  const [auth, setAuth] = useState({ loading: true, session: null, recovery: false });

  useEffect(() => {
    let alive = true;
    api.getSession().then((s) => alive && setAuth((a) => ({ ...a, loading: false, session: s })));
    const off = api.onAuth((event, session) => setAuth((a) => ({
      loading: false,
      session,
      recovery: event === 'PASSWORD_RECOVERY' ? true : event === 'SIGNED_OUT' ? false : a.recovery,
    })));
    return () => { alive = false; off?.(); };
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  if (auth.loading) return html`<${Splash} />`;
  if (auth.recovery && auth.session) {
    return html`<${NewPasswordScreen} api=${api} t=${t} errorText=${errorText} onDone=${() => setAuth((a) => ({ ...a, recovery: false }))} />`;
  }
  if (!auth.session) return html`<${LoginScreen} api=${api} t=${t} lang=${lang} setLang=${setLang} errorText=${errorText} />`;
  return html`<${App} key=${auth.session.user.id} api=${api} lang=${lang} setLang=${setLang} />`;
}

getApi()
  .then((api) => render(html`<${Root} api=${api} />`, document.getElementById('app')))
  .catch((e) => {
    console.error(e);
    document.getElementById('app').innerHTML = '<div class="auth"><div class="auth-card"><b>TODOmás no pudo arrancar.</b><p>Revisa tu conexión y recarga la página.</p></div></div>';
  });
