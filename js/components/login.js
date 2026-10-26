// Entrar / crear cuenta (solo correos invitados) / recuperar contraseña
import { html, useState, useEffect } from '../deps.js';
import { cls } from '../util.js';
import { Icon, Avatar } from './ui.js';

export function Brand({ big }) {
  return html`<span class=${cls('brand', big && 'big')}><span class="brand-mark"></span><span class="brand-word">TODO<b>más</b></span></span>`;
}

function LangSwitch({ lang, setLang }) {
  return html`<button class="btn ghost sm lang-switch" onClick=${() => setLang(lang === 'es' ? 'en' : 'es')}>
    <${Icon} name="globe" size=${14} />${lang === 'es' ? 'English' : 'Español'}</button>`;
}

export function LoginScreen({ api, t, lang, setLang, errorText }) {
  const [mode, setMode] = useState('in');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  // Con los emails apagados, "olvidé mi contraseña" le avisa al admin en vez de mandar un correo
  const [emailsOn, setEmailsOn] = useState(true);
  useEffect(() => {
    if (api.mode === 'demo') return;
    api.getAppSettings().then((s) => setEmailsOn(!!s?.emails_enabled)).catch(() => setEmailsOn(true));
  }, []);

  if (api.mode === 'demo') {
    const people = api.demoPeople();
    return html`<div class="auth">
      <div class="auth-card wide">
        <div class="auth-top"><${Brand} big /><${LangSwitch} lang=${lang} setLang=${setLang} /></div>
        <p class="auth-tag">${t('login.tagline')}</p>
        <div class="callout"><b>${t('demo.title')}</b> ${t('demo.text')}</div>
        <div class="demo-people">
          ${people.map((p) => html`<button key=${p.id} class="demo-person" onClick=${() => api.signInAs(p.id)}>
            <${Avatar} person=${p} size=${40} />
            <span><b>${p.full_name}</b><small>${p.role === 'admin' ? t('demo.admin') : t('demo.banker')}</small></span>
            <${Icon} name="arrow" size=${16} />
          </button>`)}
        </div>
      </div>
    </div>`;
  }

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    if (!email.trim()) return setMsg({ kind: 'error', text: t('login.needEmail') });
    setBusy(true);
    try {
      if (mode === 'in') {
        await api.signIn(email, pw);
      } else if (mode === 'up') {
        if (pw.length < 8) throw Object.assign(new Error('PW_SHORT'), { code: 'PW_SHORT' });
        if (pw !== pw2) throw Object.assign(new Error('PW_MISMATCH'), { code: 'PW_MISMATCH' });
        const r = await api.signUp(email, pw);
        if (r.needsConfirm) setMsg({ kind: 'ok', text: t('login.checkEmail') });
      } else if (emailsOn) {
        await api.resetPassword(email);
        setMsg({ kind: 'ok', text: t('login.resetSent') });
      } else {
        await api.requestPasswordReset(email);
        setMsg({ kind: 'ok', text: t('login.resetRequested') });
      }
    } catch (err) {
      setMsg({ kind: 'error', text: errorText(err) });
    }
    setBusy(false);
  }

  return html`<div class="auth">
    <form class="auth-card" onSubmit=${submit}>
      <div class="auth-top"><${Brand} big /><${LangSwitch} lang=${lang} setLang=${setLang} /></div>
      <p class="auth-tag">${t('login.tagline')}</p>
      ${mode !== 'reset' && html`<div class="auth-tabs">
        <button type="button" class=${cls(mode === 'in' && 'on')} onClick=${() => { setMode('in'); setMsg(null); }}>${t('login.signIn')}</button>
        <button type="button" class=${cls(mode === 'up' && 'on')} onClick=${() => { setMode('up'); setMsg(null); }}>${t('login.signUp')}</button>
      </div>`}
      ${mode === 'reset' && html`<h2 class="auth-h">${t('login.resetTitle')}</h2>`}
      ${mode === 'reset' && !emailsOn && html`<p class="hint">${t('login.resetHintAdmin')}</p>`}
      ${mode === 'up' && html`<p class="hint">${t('login.signUpHint')}</p>`}
      <label class="field"><span>${t('login.email')}</span>
        <input type="email" autocomplete="email" value=${email} onInput=${(e) => setEmail(e.target.value)} autofocus /></label>
      ${mode !== 'reset' && html`<label class="field"><span>${t('login.password')}</span>
        <input type="password" autocomplete=${mode === 'up' ? 'new-password' : 'current-password'} value=${pw} onInput=${(e) => setPw(e.target.value)} /></label>`}
      ${mode === 'up' && html`<label class="field"><span>${t('login.password2')}</span>
        <input type="password" autocomplete="new-password" value=${pw2} onInput=${(e) => setPw2(e.target.value)} /></label>`}
      ${msg && html`<div class=${cls('form-msg', msg.kind)}>${msg.text}</div>`}
      <button class="btn primary block" disabled=${busy}>
        ${mode === 'in' ? t('login.signIn') : mode === 'up' ? t('login.createAccount') : emailsOn ? t('login.sendReset') : t('login.sendResetAdmin')}</button>
      <div class="auth-links">
        ${mode === 'in' && html`<button type="button" class="link-btn" onClick=${() => { setMode('reset'); setMsg(null); }}>${t('login.forgot')}</button>`}
        ${mode === 'reset' && html`<button type="button" class="link-btn" onClick=${() => { setMode('in'); setMsg(null); }}>← ${t('login.back')}</button>`}
      </div>
    </form>
  </div>`;
}

export function NewPasswordScreen({ api, t, onDone, errorText, title, text }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState(null);
  async function submit(e) {
    e.preventDefault();
    if (pw.length < 8) return setMsg(t('login.pwShort'));
    if (pw !== pw2) return setMsg(t('login.pwMismatch'));
    try {
      await api.updatePassword(pw);
      onDone();
    } catch (err) { setMsg(errorText(err)); }
  }
  return html`<div class="auth"><form class="auth-card" onSubmit=${submit}>
    <div class="auth-top"><${Brand} big /></div>
    <h2 class="auth-h">${title || t('login.newPwTitle')}</h2>
    ${text && html`<p class="hint">${text}</p>`}
    <label class="field"><span>${t('settings.newPw')}</span><input type="password" autocomplete="new-password" value=${pw} onInput=${(e) => setPw(e.target.value)} autofocus /></label>
    <label class="field"><span>${t('settings.repeatPw')}</span><input type="password" autocomplete="new-password" value=${pw2} onInput=${(e) => setPw2(e.target.value)} /></label>
    ${msg && html`<div class="form-msg error">${msg}</div>`}
    <button class="btn primary block">${t('save')}</button>
  </form></div>`;
}
