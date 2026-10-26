// Backend de DEMO: corre todo en el navegador (localStorage) y aplica las
// mismas reglas de privacidad que la base de datos real, para poder probar
// la app cambiando de persona.
import {
  PALETTE, todayISO, addDays, nowHM, isoWeekday, autoPosition, queueOrder, uuid, isRequest,
} from '../util.js';

const KEY = 'todomas-demo-v1';
const SESSION_KEY = 'todomas-demo-session';

const PEOPLE = [
  { id: 'u-tomas', email: 'tomas@demo.todomas', full_name: 'Tomás', role: 'admin', accepts_requests: true, color: PALETTE[0] },
  { id: 'u-karime', email: 'karime@demo.todomas', full_name: 'Karime', role: 'banker', accepts_requests: false, color: PALETTE[1] },
  { id: 'u-a', email: 'banquero.a@demo.todomas', full_name: 'Banquero A', role: 'banker', accepts_requests: false, color: PALETTE[2] },
  { id: 'u-b', email: 'banquero.b@demo.todomas', full_name: 'Banquero B', role: 'banker', accepts_requests: false, color: PALETTE[3] },
  { id: 'u-c', email: 'banquero.c@demo.todomas', full_name: 'Banquero C', role: 'banker', accepts_requests: false, color: PALETTE[4] },
];

const clone = (x) => JSON.parse(JSON.stringify(x));
const nowTs = () => new Date().toISOString();
// timestamp a partir de una fecha local + hora (aprox. hora de Chile, UTC-3)
const tsAt = (iso, hm = '10:00') => new Date(`${iso}T${hm}:00-03:00`).toISOString();

function err(code) {
  const e = new Error(code);
  e.code = code;
  return e;
}

// ---------------------------------------------------------------------
// Datos de ejemplo, relativos a hoy
// ---------------------------------------------------------------------
function seed() {
  const T = todayISO();
  const db = {
    profiles: PEOPLE.map((p) => ({ ...p, active: true, lang: 'es', email_notifications: true, created_at: tsAt(addDays(T, -120)) })),
    invitations: [],
    tasks: [], shares: [], comments: [], attachments: [], notifications: [], files: {},
    recurring: [
      { id: uuid(), owner_id: 'u-tomas', title: 'Subir el acta del pipeline', detail: 'Después de la reunión de pipeline (termina a las 12:00).', weekday: 1, due_time: '12:00', priority: 3, is_private: false, active: true, created_at: tsAt(addDays(T, -60)) },
      { id: uuid(), owner_id: 'u-tomas', title: 'Mandar el mail de noticias de la semana', detail: null, weekday: 5, due_time: '17:00', priority: 2, is_private: false, active: true, created_at: tsAt(addDays(T, -60)) },
    ],
    spawns: [],
    secrets: Object.fromEntries(PEOPLE.map((p) => [p.id, 'demo' + p.id.replace(/\W/g, '')])),
  };

  const add = (t, shares = []) => {
    const task = {
      id: uuid(), detail: null, client: null, due_date: null, due_time: null, priority: 2, status: 'todo',
      is_private: false, done_note: null, recurring_id: null, started_at: null, completed_at: null, ...t,
    };
    task.created_at = task.created_at || nowTs();
    task.updated_at = task.updated_at || task.created_at;
    task.position = autoPosition(db.tasks, task.assignee_id, task, null);
    db.tasks.push(task);
    shares.forEach((u) => db.shares.push({ task_id: task.id, user_id: u }));
    return task;
  };

  // Historial (para las métricas): pedidos completados las últimas 12 semanas
  const bankers = ['u-karime', 'u-a', 'u-b', 'u-c'];
  const titles = [
    'Ficha de posiciones', 'Cotización bono corporativo', 'Resumen de mercado para cliente', 'Datos de vencimientos',
    'Material para reunión', 'Revisar term sheet', 'Flujos AFP del mes', 'Comparativo de spreads', 'Actualizar presentación',
    'Precios de cierre', 'Informe de cartera', 'Respuesta a consulta de cliente',
  ];
  const clients = ['Cliente Alfa', 'Cliente Beta', 'Cliente Gamma', 'Cliente Delta', null];
  let seedN = 7;
  const rnd = () => ((seedN = (seedN * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 46; i++) {
    const ago = Math.floor(rnd() * 82) + 2;
    const created = addDays(T, -ago);
    const who = bankers[Math.floor(rnd() * (rnd() < 0.35 ? 1 : 4))];
    const hrs = 2 + rnd() * (rnd() < 0.2 ? 90 : 30);
    const createdTs = tsAt(created, `${String(9 + Math.floor(rnd() * 8)).padStart(2, '0')}:${rnd() < 0.5 ? '15' : '40'}`);
    const doneTs = new Date(Math.min(new Date(createdTs).getTime() + hrs * 3600000, Date.now() - 3600000)).toISOString();
    add({
      created_by: who, assignee_id: 'u-tomas', title: titles[Math.floor(rnd() * titles.length)],
      client: clients[Math.floor(rnd() * clients.length)], due_date: addDays(created, 1 + Math.floor(rnd() * 3)),
      priority: 1 + Math.floor(rnd() * 3), status: 'done', created_at: createdTs, started_at: createdTs,
      completed_at: doneTs, updated_at: doneTs,
    });
  }
  // Tareas propias de Tomás ya hechas (también cuentan en "completados por semana")
  for (let w = 1; w <= 11; w++) {
    const mon = addDays(T, -(isoWeekday(T) - 1) - 7 * w);
    add({ created_by: 'u-tomas', assignee_id: 'u-tomas', title: 'Subir el acta del pipeline', due_date: mon, due_time: '12:00', priority: 3, status: 'done', created_at: tsAt(mon, '00:01'), completed_at: tsAt(mon, '12:40') });
    const fri = addDays(mon, 4);
    add({ created_by: 'u-tomas', assignee_id: 'u-tomas', title: 'Mandar el mail de noticias de la semana', due_date: fri, due_time: '17:00', priority: 2, status: 'done', created_at: tsAt(fri, '00:01'), completed_at: tsAt(fri, '17:10') });
  }

  // Abiertos
  const r1 = add({ created_by: 'u-karime', assignee_id: 'u-tomas', title: 'Ficha de posiciones Cliente Alfa', client: 'Cliente Alfa', detail: 'Necesito la ficha con posiciones y vencimientos para la reunión del jueves.', due_date: addDays(T, 1), due_time: '17:00', priority: 3, created_at: tsAt(addDays(T, -2), '11:20') });
  r1.status = 'doing'; r1.started_at = tsAt(addDays(T, -1), '09:10');
  add({ created_by: 'u-a', assignee_id: 'u-tomas', title: 'Cotización bono soberano 2035', client: 'Cliente Beta', detail: 'El cliente quiere precio indicativo para 5 MM.', due_date: T, priority: 3, created_at: tsAt(addDays(T, -1), '16:05') });
  add({ created_by: 'u-b', assignee_id: 'u-tomas', title: 'Actualizar presentación de mercado', due_date: addDays(T, 3), priority: 2, created_at: tsAt(addDays(T, -1), '10:00') });
  add({ created_by: 'u-karime', assignee_id: 'u-tomas', title: 'Resumen de flujos AFP para cliente', client: 'Cliente Gamma', due_date: addDays(T, 2), priority: 2, created_at: tsAt(T, '08:45') }, ['u-a']);
  add({ created_by: 'u-c', assignee_id: 'u-tomas', title: 'Datos de vencimientos 2027', due_date: addDays(T, 6), priority: 1, created_at: tsAt(T, '09:30') });
  add({ created_by: 'u-a', assignee_id: 'u-tomas', title: 'Revisar term sheet', detail: 'Sin apuro, cuando tengas un rato.', priority: 2, created_at: tsAt(T, '09:50') });
  add({ created_by: 'u-tomas', assignee_id: 'u-tomas', title: 'Preparar comité de inversiones', due_date: addDays(T, 2), priority: 2, created_at: tsAt(addDays(T, -3)) });
  add({ created_by: 'u-tomas', assignee_id: 'u-tomas', title: 'Hora al dentista', is_private: true, due_date: addDays(T, 1), due_time: '09:00', priority: 1, created_at: tsAt(addDays(T, -5)) });
  const lr = add({ created_by: 'u-tomas', assignee_id: 'u-tomas', title: 'Leer research de la semana', priority: 1, created_at: tsAt(addDays(T, -1)) });
  lr.status = 'doing'; lr.started_at = tsAt(T, '08:30');

  add({ created_by: 'u-karime', assignee_id: 'u-karime', title: 'Llamar a Cliente Delta', client: 'Cliente Delta', due_date: T, priority: 3, created_at: tsAt(addDays(T, -1)) }, ['u-tomas']);
  const kv = add({ created_by: 'u-karime', assignee_id: 'u-karime', title: 'Preparar visita a Cliente Alfa', client: 'Cliente Alfa', due_date: addDays(T, 2), priority: 2, created_at: tsAt(addDays(T, -2)) }, ['u-tomas']);
  kv.status = 'doing'; kv.started_at = tsAt(addDays(T, -1));
  add({ created_by: 'u-karime', assignee_id: 'u-karime', title: 'Trámite personal', is_private: true, due_date: addDays(T, 4), priority: 1, created_at: tsAt(addDays(T, -1)) });
  add({ created_by: 'u-a', assignee_id: 'u-a', title: 'Enviar propuesta a Cliente Beta', client: 'Cliente Beta', due_date: addDays(T, 1), priority: 2, created_at: tsAt(addDays(T, -1)) }, ['u-tomas']);
  add({ created_by: 'u-b', assignee_id: 'u-b', title: 'Actualizar CRM', is_private: true, priority: 1, created_at: tsAt(addDays(T, -1)) });
  const done1 = add({ created_by: 'u-karime', assignee_id: 'u-tomas', title: 'Precios de cierre del viernes', priority: 2, due_date: addDays(T, -1), status: 'done', created_at: tsAt(addDays(T, -2), '15:00'), started_at: tsAt(addDays(T, -2), '15:30'), completed_at: tsAt(addDays(T, -1), '10:15'), done_note: 'Te los dejé adjuntos. Ojo con el bono 2031, cotizó con poco volumen.' });

  db.comments.push({ id: uuid(), task_id: r1.id, author_id: 'u-tomas', body: 'Voy en eso, te la mando mañana temprano.', created_at: tsAt(T, '09:15') });
  db.comments.push({ id: uuid(), task_id: r1.id, author_id: 'u-karime', body: '¡Gracias! Si puedes, agrega los cupones.', created_at: tsAt(T, '09:40') });

  const notif = (user_id, type, task, actor_id, extra = {}) => db.notifications.push({
    id: db.notifications.length + 1, user_id, task_id: task?.id ?? null, type, actor_id,
    payload: { title: task?.title, ...extra }, read_at: null, created_at: task?.created_at || nowTs(),
  });
  db.tasks.filter((t) => isRequest(t) && t.status !== 'done' && t.created_at > tsAt(addDays(T, -1), '00:00'))
    .forEach((t) => notif('u-tomas', 'new_request', t, t.created_by));
  notif('u-karime', 'done', done1, 'u-tomas');
  db.notifications.at(-1).created_at = done1.completed_at;
  return db;
}

// ---------------------------------------------------------------------
export function createDemoApi() {
  let db;
  try { db = JSON.parse(localStorage.getItem(KEY)); } catch { db = null; }
  if (!db || !db.profiles) db = seed();
  const listeners = new Set();
  const authListeners = new Set();
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* sin espacio: queda en memoria */ }
    listeners.forEach((fn) => fn());
  };

  let uid = null;
  try { uid = localStorage.getItem(SESSION_KEY); } catch { /* */ }
  const me = () => db.profiles.find((p) => p.id === uid);
  const active = () => !!me()?.active;
  const session = () => (uid && me() ? { user: { id: uid, email: me().email } } : null);

  const shared = (taskId, userId) => db.shares.some((s) => s.task_id === taskId && s.user_id === userId);
  const canSee = (t) => active() && (t.created_by === uid || t.assignee_id === uid || (!t.is_private && shared(t.id, uid)));
  const canEdit = (t) => active() && (t.created_by === uid || t.assignee_id === uid);
  const find = (id) => db.tasks.find((t) => t.id === id);
  const name = (id) => db.profiles.find((p) => p.id === id)?.full_name;

  function payload(t) {
    return { title: t.title, client: t.client, due_date: t.due_date, due_time: t.due_time, priority: t.priority, status: t.status, done_note: t.done_note, requester_name: name(t.created_by), assignee_name: name(t.assignee_id) };
  }
  function notify(user_id, type, task, actor_id, extra = {}) {
    db.notifications.push({ id: Date.now() + Math.random(), user_id, task_id: task ? task.id : null, type, actor_id, payload: { ...payload(task), ...extra }, read_at: null, created_at: nowTs() });
  }
  function withMeta(t) {
    return {
      ...clone(t),
      shares: db.shares.filter((s) => s.task_id === t.id).map((s) => s.user_id),
      comments_count: db.comments.filter((c) => c.task_id === t.id).length,
      attachments_count: db.attachments.filter((a) => a.task_id === t.id).length,
    };
  }

  // Recurrentes: se crean el día que corresponde (como el cron real)
  function spawnRecurring() {
    const T = todayISO();
    const hm = nowHM();
    let changed = false;
    for (const r of db.recurring) {
      if (!r.active || r.weekday !== isoWeekday(T)) continue;
      const owner = db.profiles.find((p) => p.id === r.owner_id);
      if (!owner?.active) continue;
      const createdBefore = r.created_at < tsAt(T, '00:00');
      if (!createdBefore && r.due_time && hm >= r.due_time) continue;
      if (db.spawns.some((s) => s.recurring_id === r.id && s.date === T)) continue;
      db.spawns.push({ recurring_id: r.id, date: T });
      const t = { id: uuid(), created_by: r.owner_id, assignee_id: r.owner_id, title: r.title, detail: r.detail, client: null, due_date: T, due_time: r.due_time, priority: r.priority, status: 'todo', is_private: r.is_private, done_note: null, recurring_id: r.id, created_at: nowTs(), updated_at: nowTs(), started_at: null, completed_at: null };
      t.position = autoPosition(db.tasks, t.assignee_id, t, null);
      db.tasks.push(t);
      changed = true;
    }
    if (changed) save();
  }
  spawnRecurring();

  const api = {
    mode: 'demo',

    // ---------- sesión ----------
    async getSession() { return session(); },
    onAuth(cb) { authListeners.add(cb); return () => authListeners.delete(cb); },
    demoPeople() { return clone(db.profiles); },
    async signInAs(id) {
      uid = id;
      try { localStorage.setItem(SESSION_KEY, id); } catch { /* */ }
      spawnRecurring();
      authListeners.forEach((cb) => cb('SIGNED_IN', session()));
    },
    async signIn() { throw err('DEMO_PICK_USER'); },
    async signUp() { throw err('DEMO_PICK_USER'); },
    async resetPassword() { throw err('DEMO_NO_EMAIL'); },
    async updatePassword() { /* en demo no hay contraseñas */ },
    async signOut() {
      uid = null;
      try { localStorage.removeItem(SESSION_KEY); } catch { /* */ }
      authListeners.forEach((cb) => cb('SIGNED_OUT', null));
    },
    resetDemo() {
      db = seed();
      save();
    },

    // ---------- datos ----------
    async getMe() { return me() ? clone(me()) : null; },
    async listProfiles() { return active() ? clone(db.profiles) : [clone(me())]; },
    async listTasks() { return db.tasks.filter(canSee).map(withMeta); },
    async getAppSettings() { return { emails_enabled: true }; },
    async getQueue(receiverId) {
      const r = db.profiles.find((p) => p.id === receiverId);
      if (!active() || !r?.accepts_requests) return [];
      return queueOrder(db.tasks.filter((t) => t.assignee_id === receiverId && !t.is_private))
        .map((t, i) => {
          const see = t.created_by === uid || t.assignee_id === uid || shared(t.id, uid);
          return { task_id: t.id, queue_pos: i + 1, status: t.status, priority: t.priority, due_date: t.due_date, due_time: t.due_time, requester_id: t.created_by, is_request: isRequest(t), can_see: see, title: see ? t.title : null, client: see ? t.client : null, created_at: t.created_at };
        });
    },

    async createTask(f) {
      if (!active()) throw err('TODOMAS_FORBIDDEN');
      const assignee = db.profiles.find((p) => p.id === f.assignee_id);
      if (f.assignee_id !== uid && !(assignee?.active && assignee.accepts_requests)) throw err('TODOMAS_FORBIDDEN');
      const t = {
        id: uuid(), created_by: uid, assignee_id: f.assignee_id, title: f.title.trim(), detail: f.detail || null,
        client: f.client || null, due_date: f.due_date || null, due_time: f.due_time || null, priority: f.priority || 2,
        status: 'todo', is_private: !!f.is_private, done_note: null, recurring_id: null,
        created_at: nowTs(), updated_at: nowTs(), started_at: null, completed_at: null,
      };
      if (isRequest(t)) t.is_private = false;
      t.position = autoPosition(db.tasks, t.assignee_id, t, null);
      db.tasks.push(t);
      (f.shares || []).filter((u) => u !== uid && !t.is_private).forEach((u) => db.shares.push({ task_id: t.id, user_id: u }));
      if (isRequest(t)) notify(t.assignee_id, 'new_request', t, uid);
      save();
      return withMeta(t);
    },

    async updateTask(id, patch) {
      const t = find(id);
      if (!t || !canEdit(t)) throw err('TODOMAS_FORBIDDEN');
      const req = isRequest(t);
      const changed = (k) => k in patch && patch[k] !== t[k];
      if (req && uid === t.created_by && ['status', 'position', 'done_note'].some(changed)) throw err('TODOMAS_ONLY_ASSIGNEE');
      if (req && uid === t.assignee_id && ['title', 'detail', 'client', 'priority'].some(changed)) throw err('TODOMAS_ONLY_REQUESTER');
      const old = { ...t };
      Object.assign(t, patch);
      if (req) t.is_private = false;
      t.updated_at = nowTs();
      if (t.status !== old.status) {
        if (t.status === 'doing' && !old.started_at) t.started_at = nowTs();
        t.completed_at = t.status === 'done' ? nowTs() : null;
      }
      if (t.status === 'todo' && t.position === old.position && (old.status !== 'todo' || t.due_date !== old.due_date || t.due_time !== old.due_time || t.priority !== old.priority)) {
        t.position = autoPosition(db.tasks, t.assignee_id, t, t.id);
      }
      if (t.is_private && !old.is_private) db.shares = db.shares.filter((s) => s.task_id !== t.id);
      if (req) {
        if (t.status === 'done' && old.status !== 'done') notify(t.created_by, 'done', t, t.assignee_id);
        if (t.status !== 'done' && (t.due_date !== old.due_date || t.due_time !== old.due_time)) {
          notify(uid === t.assignee_id ? t.created_by : t.assignee_id, 'date_changed', t, uid, { old_due_date: old.due_date, old_due_time: old.due_time });
        }
      }
      save();
      return withMeta(t);
    },

    async setShares(id, userIds) {
      const t = find(id);
      if (!t || t.created_by !== uid) throw err('TODOMAS_FORBIDDEN');
      db.shares = db.shares.filter((s) => s.task_id !== id);
      if (!t.is_private) userIds.filter((u) => u !== uid).forEach((u) => db.shares.push({ task_id: id, user_id: u }));
      save();
    },

    async deleteTask(id) {
      const t = find(id);
      if (!t || t.created_by !== uid) throw err('TODOMAS_FORBIDDEN');
      if (isRequest(t) && t.status !== 'done') {
        db.notifications.push({ id: Date.now(), user_id: t.assignee_id, task_id: null, type: 'cancelled', actor_id: uid, payload: payload(t), read_at: null, created_at: nowTs() });
      }
      db.tasks = db.tasks.filter((x) => x.id !== id);
      db.shares = db.shares.filter((s) => s.task_id !== id);
      db.comments = db.comments.filter((c) => c.task_id !== id);
      db.attachments.filter((a) => a.task_id === id).forEach((a) => delete db.files[a.storage_path]);
      db.attachments = db.attachments.filter((a) => a.task_id !== id);
      db.notifications.forEach((n) => { if (n.task_id === id) n.task_id = null; });
      save();
    },

    // ---------- comentarios ----------
    async listComments(taskId) {
      const t = find(taskId);
      if (!t || !canSee(t)) return [];
      return clone(db.comments.filter((c) => c.task_id === taskId).sort((a, b) => a.created_at.localeCompare(b.created_at)));
    },
    async addComment(taskId, body) {
      const t = find(taskId);
      if (!t || !canSee(t)) throw err('TODOMAS_FORBIDDEN');
      const c = { id: uuid(), task_id: taskId, author_id: uid, body: body.trim(), created_at: nowTs() };
      db.comments.push(c);
      [...new Set([t.created_by, t.assignee_id])].filter((u) => u !== uid)
        .forEach((u) => notify(u, 'comment', t, uid, { comment: c.body.slice(0, 280) }));
      save();
      return clone(c);
    },
    async deleteComment(id) {
      db.comments = db.comments.filter((c) => !(c.id === id && c.author_id === uid));
      save();
    },

    // ---------- adjuntos ----------
    async listAttachments(taskId) {
      const t = find(taskId);
      if (!t || !canSee(t)) return [];
      return clone(db.attachments.filter((a) => a.task_id === taskId));
    },
    async uploadAttachment(taskId, file, kind = 'request') {
      const t = find(taskId);
      if (!t || !canEdit(t)) throw err('TODOMAS_FORBIDDEN');
      if (file.size > 1024 * 1024) throw err('DEMO_FILE_TOO_BIG');
      const dataUrl = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const a = { id: uuid(), task_id: taskId, uploaded_by: uid, storage_path: `${taskId}/${uuid()}`, file_name: file.name, size_bytes: file.size, kind, created_at: nowTs() };
      db.files[a.storage_path] = dataUrl;
      db.attachments.push(a);
      save();
      return clone(a);
    },
    async attachmentUrl(a) { return db.files[a.storage_path] || null; },
    async deleteAttachment(a) {
      if (a.uploaded_by !== uid) throw err('TODOMAS_FORBIDDEN');
      db.attachments = db.attachments.filter((x) => x.id !== a.id);
      delete db.files[a.storage_path];
      save();
    },

    // ---------- avisos ----------
    async listNotifications() {
      return clone(db.notifications.filter((n) => n.user_id === uid).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 60));
    },
    async markRead(ids) {
      db.notifications.forEach((n) => { if (n.user_id === uid && ids.includes(n.id) && !n.read_at) n.read_at = nowTs(); });
      save();
    },
    async markAllRead() {
      db.notifications.forEach((n) => { if (n.user_id === uid && !n.read_at) n.read_at = nowTs(); });
      save();
    },

    // ---------- administración ----------
    async listInvitations() { return me()?.role === 'admin' ? clone(db.invitations) : []; },
    async invite(inv) {
      if (me()?.role !== 'admin') throw err('TODOMAS_FORBIDDEN');
      const email = inv.email.trim().toLowerCase();
      if (db.profiles.some((p) => p.email === email)) throw err('ALREADY_USER');
      db.invitations = db.invitations.filter((i) => i.email !== email);
      db.invitations.push({ ...inv, email, created_at: nowTs(), accepted_at: null });
      save();
    },
    async deleteInvitation(email) {
      db.invitations = db.invitations.filter((i) => i.email !== email);
      save();
    },
    async updateProfile(id, patch) {
      const p = db.profiles.find((x) => x.id === id);
      const admin = me()?.role === 'admin';
      if (!p || (id !== uid && !admin)) throw err('TODOMAS_FORBIDDEN');
      if (!admin && ['role', 'active', 'accepts_requests', 'email'].some((k) => k in patch && patch[k] !== p[k])) throw err('TODOMAS_FORBIDDEN');
      if (admin && id === uid && (patch.active === false || (patch.role && patch.role !== 'admin'))) throw err('TODOMAS_CANNOT_DEMOTE_SELF');
      Object.assign(p, patch);
      save();
      return clone(p);
    },

    // ---------- recurrentes ----------
    async listRecurring() { return clone(db.recurring.filter((r) => r.owner_id === uid)); },
    async saveRecurring(r) {
      if (r.id) {
        const x = db.recurring.find((y) => y.id === r.id && y.owner_id === uid);
        if (!x) throw err('TODOMAS_FORBIDDEN');
        Object.assign(x, r);
      } else {
        db.recurring.push({ active: true, is_private: false, priority: 2, detail: null, ...r, id: uuid(), owner_id: uid, created_at: nowTs() });
      }
      save();
      spawnRecurring();
    },
    async deleteRecurring(id) {
      db.recurring = db.recurring.filter((r) => !(r.id === id && r.owner_id === uid));
      save();
    },

    // ---------- calendario ----------
    async getCalendarUrl() { return null; },
    async regenerateCalendar() { return null; },

    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
  return api;
}
