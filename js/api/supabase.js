// Backend real: Supabase. Toda la privacidad la aplica la base de datos (RLS);
// este archivo solo traduce las llamadas de la app.
import { SUPABASE_ESM } from '../deps.js';
import { uuid, safeFileName } from '../util.js';

const hm = (t) => (t ? t.slice(0, 5) : null);

function normTask(r) {
  const { task_shares, task_comments, task_attachments, ...t } = r;
  return {
    ...t,
    due_time: hm(t.due_time),
    shares: (task_shares || []).map((s) => s.user_id),
    comments_count: task_comments?.[0]?.count ?? 0,
    attachments_count: task_attachments?.[0]?.count ?? 0,
  };
}

function fail(error) {
  if (!error) return;
  const msg = error.message || String(error);
  const code = (msg.match(/TODOMAS_[A-Z_]+/) || [])[0];
  const e = new Error(code || msg);
  e.code = code || error.code || 'ERROR';
  e.raw = error;
  throw e;
}

export async function createSupabaseApi(cfg) {
  const { createClient } = await import(SUPABASE_ESM);
  const sb = createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  let uid = null;
  sb.auth.getSession().then(({ data }) => { uid = data.session?.user?.id ?? null; });
  sb.auth.onAuthStateChange((_e, s) => { uid = s?.user?.id ?? null; });

  // PostgREST entrega máximo 1000 filas por llamada: paginamos
  async function fetchAll(build) {
    const out = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await build().range(from, from + 999);
      fail(error);
      out.push(...data);
      if (data.length < 1000) return out;
    }
  }

  const api = {
    mode: 'supabase',

    // ---------- sesión ----------
    async getSession() {
      const { data } = await sb.auth.getSession();
      uid = data.session?.user?.id ?? null;
      return data.session;
    },
    onAuth(cb) {
      const { data } = sb.auth.onAuthStateChange((event, session) => {
        uid = session?.user?.id ?? null;
        cb(event, session);
      });
      return () => data.subscription.unsubscribe();
    },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) {
        const e = new Error(/invalid login/i.test(error.message) ? 'BAD_CREDENTIALS'
          : /not confirmed/i.test(error.message) ? 'EMAIL_NOT_CONFIRMED' : error.message);
        e.code = e.message;
        throw e;
      }
    },
    async signUp(email, password) {
      const { data, error } = await sb.auth.signUp({ email: email.trim().toLowerCase(), password });
      if (error) {
        const m = error.message || '';
        const code = /database error|not_invited|TODOMAS_NOT_INVITED/i.test(m) ? 'NOT_INVITED'
          : /already registered|already exists/i.test(m) ? 'ALREADY_USER'
          : /password/i.test(m) ? 'WEAK_PASSWORD' : m;
        const e = new Error(code);
        e.code = code;
        throw e;
      }
      return { needsConfirm: !data.session };
    },
    async resetPassword(email) {
      const { error } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: location.origin + location.pathname,
      });
      fail(error);
    },
    async updatePassword(password) {
      const { error } = await sb.auth.updateUser({ password });
      fail(error);
    },
    async signOut() { await sb.auth.signOut(); },

    // ---------- datos ----------
    async getMe() {
      if (!uid) await api.getSession();
      const { data, error } = await sb.from('profiles').select('*').eq('id', uid).maybeSingle();
      fail(error);
      return data;
    },
    async listProfiles() {
      const { data, error } = await sb.from('profiles').select('*').order('created_at');
      fail(error);
      return data;
    },
    async listTasks() {
      const rows = await fetchAll(() => sb.from('tasks')
        .select('*, task_shares(user_id), task_comments(count), task_attachments(count)')
        .order('created_at'));
      return rows.map(normTask);
    },
    async getQueue(receiverId) {
      const { data, error } = await sb.rpc('get_queue', { p_receiver: receiverId });
      fail(error);
      return (data || []).map((q) => ({ ...q, due_time: hm(q.due_time) }));
    },

    async createTask(f) {
      const { shares = [], ...fields } = f;
      const { data, error } = await sb.from('tasks').insert({
        created_by: uid,
        assignee_id: fields.assignee_id,
        title: fields.title.trim(),
        detail: fields.detail || null,
        client: fields.client || null,
        due_date: fields.due_date || null,
        due_time: fields.due_time || null,
        priority: fields.priority || 2,
        is_private: !!fields.is_private,
      }).select().single();
      fail(error);
      const toShare = data.is_private ? [] : shares.filter((u) => u !== uid);
      if (toShare.length) {
        const r = await sb.from('task_shares').insert(toShare.map((user_id) => ({ task_id: data.id, user_id })));
        fail(r.error);
      }
      return normTask({ ...data, task_shares: toShare.map((user_id) => ({ user_id })) });
    },
    async updateTask(id, patch) {
      const p = { ...patch };
      if ('due_time' in p) p.due_time = p.due_time || null;
      if ('due_date' in p) p.due_date = p.due_date || null;
      const { data, error } = await sb.from('tasks').update(p).eq('id', id).select().single();
      fail(error);
      return normTask(data);
    },
    async setShares(id, userIds) {
      const { data: cur, error } = await sb.from('task_shares').select('user_id').eq('task_id', id);
      fail(error);
      const have = cur.map((r) => r.user_id);
      const add = userIds.filter((u) => u !== uid && !have.includes(u));
      const del = have.filter((u) => !userIds.includes(u));
      if (del.length) fail((await sb.from('task_shares').delete().eq('task_id', id).in('user_id', del)).error);
      if (add.length) fail((await sb.from('task_shares').insert(add.map((user_id) => ({ task_id: id, user_id })))).error);
    },
    async deleteTask(id) {
      const { data: atts } = await sb.from('task_attachments').select('storage_path').eq('task_id', id);
      if (atts?.length) await sb.storage.from('attachments').remove(atts.map((a) => a.storage_path));
      const { error } = await sb.from('tasks').delete().eq('id', id);
      fail(error);
    },

    // ---------- comentarios ----------
    async listComments(taskId) {
      const { data, error } = await sb.from('task_comments').select('*').eq('task_id', taskId).order('created_at');
      fail(error);
      return data;
    },
    async addComment(taskId, body) {
      const { data, error } = await sb.from('task_comments')
        .insert({ task_id: taskId, author_id: uid, body: body.trim() }).select().single();
      fail(error);
      return data;
    },
    async deleteComment(id) {
      fail((await sb.from('task_comments').delete().eq('id', id)).error);
    },

    // ---------- adjuntos ----------
    async listAttachments(taskId) {
      const { data, error } = await sb.from('task_attachments').select('*').eq('task_id', taskId).order('created_at');
      fail(error);
      return data;
    },
    async uploadAttachment(taskId, file, kind = 'request') {
      if (file.size > 10 * 1024 * 1024) { const e = new Error('FILE_TOO_BIG'); e.code = 'FILE_TOO_BIG'; throw e; }
      const path = `${taskId}/${uuid()}-${safeFileName(file.name)}`;
      const up = await sb.storage.from('attachments').upload(path, file, { contentType: file.type || undefined });
      fail(up.error);
      const { data, error } = await sb.from('task_attachments').insert({
        task_id: taskId, uploaded_by: uid, storage_path: path, file_name: file.name, size_bytes: file.size, kind,
      }).select().single();
      if (error) await sb.storage.from('attachments').remove([path]);
      fail(error);
      return data;
    },
    async attachmentUrl(a) {
      const { data, error } = await sb.storage.from('attachments').createSignedUrl(a.storage_path, 300, { download: a.file_name });
      fail(error);
      return data.signedUrl;
    },
    async deleteAttachment(a) {
      await sb.storage.from('attachments').remove([a.storage_path]);
      fail((await sb.from('task_attachments').delete().eq('id', a.id)).error);
    },

    // ---------- avisos ----------
    async listNotifications() {
      const { data, error } = await sb.from('notifications')
        .select('id, user_id, task_id, type, actor_id, payload, read_at, created_at')
        .order('created_at', { ascending: false }).limit(60);
      fail(error);
      return data;
    },
    async markRead(ids) {
      if (!ids.length) return;
      fail((await sb.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids).is('read_at', null)).error);
    },
    async markAllRead() {
      fail((await sb.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', uid).is('read_at', null)).error);
    },

    // ---------- administración ----------
    async listInvitations() {
      const { data, error } = await sb.from('invitations').select('*').order('created_at');
      fail(error);
      return data;
    },
    async invite(inv) {
      const { error } = await sb.from('invitations').upsert({ ...inv, email: inv.email.trim().toLowerCase() });
      fail(error);
    },
    async deleteInvitation(email) {
      fail((await sb.from('invitations').delete().eq('email', email)).error);
    },
    async updateProfile(id, patch) {
      const { data, error } = await sb.from('profiles').update(patch).eq('id', id).select().single();
      fail(error);
      return data;
    },

    // ---------- recurrentes ----------
    async listRecurring() {
      const { data, error } = await sb.from('recurring_tasks').select('*').eq('owner_id', uid).order('weekday');
      fail(error);
      return data.map((r) => ({ ...r, due_time: hm(r.due_time) }));
    },
    async saveRecurring(r) {
      const row = {
        title: r.title.trim(), detail: r.detail || null, weekday: r.weekday, due_time: r.due_time || null,
        priority: r.priority || 2, is_private: !!r.is_private, active: r.active !== false,
      };
      const q = r.id
        ? sb.from('recurring_tasks').update(row).eq('id', r.id)
        : sb.from('recurring_tasks').insert({ ...row, owner_id: uid });
      fail((await q).error);
    },
    async deleteRecurring(id) {
      fail((await sb.from('recurring_tasks').delete().eq('id', id)).error);
    },

    // ---------- calendario ----------
    async getCalendarUrl() {
      const { data, error } = await sb.from('user_secrets').select('calendar_token').eq('user_id', uid).maybeSingle();
      fail(error);
      return data ? `${cfg.supabaseUrl.replace(/\/$/, '')}/functions/v1/calendar?token=${data.calendar_token}` : null;
    },
    async regenerateCalendar() {
      const token = (uuid() + uuid()).replace(/-/g, '');
      fail((await sb.from('user_secrets').update({ calendar_token: token }).eq('user_id', uid)).error);
      return api.getCalendarUrl();
    },

    // ---------- tiempo real ----------
    subscribe(fn) {
      const ch = sb.channel(`todomas-${uid}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fn)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'task_comments' }, fn)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` }, fn)
        .subscribe();
      return () => sb.removeChannel(ch);
    },
  };
  return api;
}
