-- =====================================================================
--  TODOmás · 01_esquema.sql
--
--  Pégalo completo en Supabase → SQL Editor → "New query" → Run.
--  Se puede volver a correr sin perder datos: todo es "if not exists",
--  "create or replace" o "drop ... if exists" antes de crear.
--
--  Aquí vive la privacidad: las reglas (RLS) se aplican en la base de
--  datos, así que nadie puede saltárselas desde el navegador.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Extensiones: cron (tareas programadas) y pg_net (llamar a la función
-- que manda los emails).
-- ---------------------------------------------------------------------
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;


-- =====================================================================
-- 1. Tablas
-- =====================================================================

-- Personas que usan la app (se crean solas al registrarse con un correo invitado)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null default 'banker' check (role in ('admin', 'banker')),
  accepts_requests boolean not null default false,  -- puede recibir pedidos (hoy: solo Tomás)
  active boolean not null default true,
  lang text not null default 'es' check (lang in ('es', 'en')),
  color text not null default '#2a78d6',
  email_notifications boolean not null default true,
  created_at timestamptz not null default now()
);

-- Solo los correos invitados pueden crear cuenta
create table if not exists public.invitations (
  email text primary key check (email = lower(trim(email))),
  full_name text not null,
  role text not null default 'banker' check (role in ('admin', 'banker')),
  accepts_requests boolean not null default false,
  color text,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

-- Token secreto del calendario de cada persona (nadie más lo ve)
create table if not exists public.user_secrets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  calendar_token text not null unique
    default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
);

-- Pendientes que se repiten cada semana (acta del pipeline, mail de noticias…)
create table if not exists public.recurring_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  detail text,
  weekday smallint not null check (weekday between 1 and 7),  -- 1 = lunes … 7 = domingo
  due_time time,
  priority smallint not null default 2 check (priority between 1 and 3),
  is_private boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Pendientes. Si created_by = assignee_id es una tarea personal;
-- si son distintos es un pedido (un banquero le pide algo a Tomás).
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id),
  assignee_id uuid not null references public.profiles(id),
  title text not null check (length(trim(title)) > 0),
  detail text,
  client text,
  due_date date,
  due_time time,
  priority smallint not null default 2 check (priority between 1 and 3),  -- 3 alta, 2 media, 1 baja
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  is_private boolean not null default false,
  position double precision not null default 0,  -- orden en la cola
  done_note text,
  recurring_id uuid references public.recurring_tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  constraint tasks_private_only_personal check (not is_private or created_by = assignee_id)
);
create index if not exists tasks_assignee_status_idx on public.tasks (assignee_id, status);
create index if not exists tasks_created_by_idx on public.tasks (created_by);

-- Con quién se comparte el detalle de un pendiente
create table if not exists public.task_shares (
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (task_id, user_id)
);
create index if not exists task_shares_user_idx on public.task_shares (user_id);

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);
create index if not exists task_comments_task_idx on public.task_comments (task_id);

create table if not exists public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id),
  storage_path text not null unique,
  file_name text not null,
  size_bytes bigint,
  kind text not null default 'request' check (kind in ('request', 'response')),
  created_at timestamptz not null default now()
);
create index if not exists task_attachments_task_idx on public.task_attachments (task_id);

-- Avisos dentro de la app. También es la cola de emails por enviar.
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  type text not null check (type in
    ('new_request', 'done', 'date_changed', 'cancelled', 'comment', 'due_soon', 'digest')),
  actor_id uuid references public.profiles(id),
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  email_status text not null default 'pending'
    check (email_status in ('pending', 'sending', 'sent', 'skipped', 'error')),
  email_attempts smallint not null default 0,
  email_error text,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_email_idx on public.notifications (email_status)
  where email_status in ('pending', 'sending');

-- Tablas internas (sin acceso desde la app)
create table if not exists public.recurring_spawns (
  recurring_id uuid not null references public.recurring_tasks(id) on delete cascade,
  occurrence_date date not null,
  primary key (recurring_id, occurrence_date)
);
create table if not exists public.daily_jobs (
  job text not null,
  run_date date not null,
  primary key (job, run_date)
);
create table if not exists public.app_config (
  key text primary key,
  value text not null
);


-- =====================================================================
-- 2. Funciones de apoyo para las reglas de acceso
-- =====================================================================

create or replace function public.app_tz() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select value from app_config where key = 'timezone'), 'America/Santiago');
$$;

create or replace function public.is_active_user() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and active);
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and active and role = 'admin');
$$;

create or replace function public.is_shared_with_me(p_task uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from task_shares where task_id = p_task and user_id = auth.uid());
$$;

-- ¿Puedo ver el detalle de este pendiente?
create or replace function public.can_see_task(p_task uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_active_user() and exists (
    select 1 from tasks t
    where t.id = p_task
      and (t.created_by = auth.uid()
           or t.assignee_id = auth.uid()
           or (not t.is_private and public.is_shared_with_me(t.id))));
$$;

-- ¿Puedo editarlo / adjuntarle archivos? (quien lo creó o quien lo tiene que hacer)
create or replace function public.can_edit_task(p_task uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_active_user() and exists (
    select 1 from tasks t
    where t.id = p_task and (t.created_by = auth.uid() or t.assignee_id = auth.uid()));
$$;

create or replace function public.is_task_creator(p_task uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_active_user() and exists (
    select 1 from tasks t where t.id = p_task and t.created_by = auth.uid());
$$;

-- Los archivos se guardan como "<id del pendiente>/<archivo>"
create or replace function public.task_id_from_path(p_path text) returns uuid
language plpgsql immutable as $$
declare
  first_part text := split_part(p_path, '/', 1);
begin
  if first_part ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return first_part::uuid;
  end if;
  return null;
end $$;


-- =====================================================================
-- 3. Orden de la cola
--    Un pedido nuevo entra según fecha límite y luego prioridad.
--    Tomás puede reordenar arrastrando y ese orden se respeta.
-- =====================================================================

create or replace function public.goes_before(
  a_date date, a_time time, a_prio smallint,
  b_date date, b_time time, b_prio smallint) returns boolean
language sql immutable as $$
  select case
    when a_date is distinct from b_date then a_date is not null and (b_date is null or a_date < b_date)
    when a_time is distinct from b_time then a_time is not null and (b_time is null or a_time < b_time)
    else a_prio > b_prio
  end;
$$;

create or replace function public.auto_position(
  p_assignee uuid, p_date date, p_time time, p_prio smallint, p_exclude uuid)
returns double precision
language plpgsql stable security definer set search_path = public as $$
declare
  r record;
  prev double precision;
begin
  for r in
    select position, due_date, due_time, priority
    from tasks
    where assignee_id = p_assignee and status = 'todo' and id is distinct from p_exclude
    order by position, created_at
  loop
    if public.goes_before(p_date, p_time, p_prio, r.due_date, r.due_time, r.priority) then
      return case when prev is null then r.position - 1 else (prev + r.position) / 2 end;
    end if;
    prev := r.position;
  end loop;
  return coalesce(prev, 0) + 1;
end $$;


-- =====================================================================
-- 4. Altas de usuarios: solo correos invitados
-- =====================================================================

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  inv public.invitations;
begin
  select * into inv from invitations where email = lower(trim(new.email));
  if not found then
    raise exception 'TODOMAS_NOT_INVITED';
  end if;

  insert into profiles (id, email, full_name, role, accepts_requests, color)
  values (new.id, inv.email, inv.full_name, inv.role, inv.accepts_requests,
          coalesce(inv.color, '#2a78d6'))
  on conflict (id) do nothing;

  insert into user_secrets (user_id) values (new.id) on conflict do nothing;
  update invitations set accepted_at = now() where email = inv.email;
  return new;
end $$;

drop trigger if exists todomas_on_auth_user_created on auth.users;
create trigger todomas_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Nadie se sube de rol solo; el admin no se puede desactivar a sí mismo
create or replace function public.profiles_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.id := old.id;
  new.created_at := old.created_at;
  if auth.uid() is null then
    return new;
  end if;
  if not public.is_admin() then
    if new.role is distinct from old.role
       or new.active is distinct from old.active
       or new.accepts_requests is distinct from old.accepts_requests
       or new.email is distinct from old.email then
      raise exception 'TODOMAS_FORBIDDEN';
    end if;
  elsif new.id = auth.uid() and (not new.active or new.role <> 'admin') then
    raise exception 'TODOMAS_CANNOT_DEMOTE_SELF';
  end if;
  return new;
end $$;

drop trigger if exists todomas_profiles_before_update on public.profiles;
create trigger todomas_profiles_before_update
  before update on public.profiles
  for each row execute function public.profiles_before_update();


-- =====================================================================
-- 5. Reglas de los pendientes
-- =====================================================================

create or replace function public.task_payload(t public.tasks) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'title', t.title,
    'client', t.client,
    'due_date', t.due_date,
    'due_time', to_char(t.due_time, 'HH24:MI'),
    'priority', t.priority,
    'status', t.status,
    'done_note', t.done_note,
    'requester_name', (select full_name from profiles where id = t.created_by),
    'assignee_name', (select full_name from profiles where id = t.assignee_id));
$$;

create or replace function public.tasks_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.created_by <> new.assignee_id then
    -- un pedido siempre entra pendiente y nunca es privado (todos lo ven en la cola, sin detalle)
    new.is_private := false;
    new.status := 'todo';
  end if;
  new.created_at := now();
  new.updated_at := now();
  new.started_at := case when new.status = 'doing' then now() end;
  new.completed_at := case when new.status = 'done' then now() end;
  new.position := public.auto_position(new.assignee_id, new.due_date, new.due_time, new.priority, null);
  return new;
end $$;

create or replace function public.tasks_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  is_request boolean := old.created_by <> old.assignee_id;
begin
  if new.created_by is distinct from old.created_by
     or new.assignee_id is distinct from old.assignee_id then
    raise exception 'TODOMAS_NO_REASSIGN';
  end if;

  if uid is not null and is_request then
    if uid = old.created_by then
      -- el banquero no mueve el estado ni el orden de la cola de Tomás
      if new.status is distinct from old.status
         or new.position is distinct from old.position
         or new.done_note is distinct from old.done_note then
        raise exception 'TODOMAS_ONLY_ASSIGNEE';
      end if;
    elsif uid = old.assignee_id then
      -- Tomás puede mover el estado, el orden y la fecha; el contenido y la prioridad son del banquero
      if new.title is distinct from old.title
         or new.detail is distinct from old.detail
         or new.client is distinct from old.client
         or new.priority is distinct from old.priority then
        raise exception 'TODOMAS_ONLY_REQUESTER';
      end if;
    end if;
  end if;

  if is_request then
    new.is_private := false;
  end if;
  new.recurring_id := old.recurring_id;
  new.created_at := old.created_at;
  new.updated_at := now();

  if new.status is distinct from old.status then
    new.started_at := case when new.status = 'doing' and old.started_at is null then now() else old.started_at end;
    new.completed_at := case when new.status = 'done' then now() end;
  else
    new.started_at := old.started_at;
    new.completed_at := old.completed_at;
  end if;

  -- si no lo reordenaron a mano pero cambió la fecha/prioridad (o volvió a pendiente), se reubica solo
  if new.status = 'todo' and new.position is not distinct from old.position and (
       old.status <> 'todo'
       or new.due_date is distinct from old.due_date
       or new.due_time is distinct from old.due_time
       or new.priority is distinct from old.priority) then
    new.position := public.auto_position(new.assignee_id, new.due_date, new.due_time, new.priority, new.id);
  end if;
  return new;
end $$;

create or replace function public.tasks_after_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    if new.created_by <> new.assignee_id then
      insert into notifications (user_id, task_id, type, actor_id, payload)
      values (new.assignee_id, new.id, 'new_request', new.created_by, public.task_payload(new));
    end if;
    return new;

  elsif tg_op = 'UPDATE' then
    if new.is_private and not old.is_private then
      delete from task_shares where task_id = new.id;
    end if;
    if new.created_by <> new.assignee_id then
      if new.status = 'done' and old.status <> 'done' then
        insert into notifications (user_id, task_id, type, actor_id, payload)
        values (new.created_by, new.id, 'done', new.assignee_id, public.task_payload(new));
      end if;
      if new.status <> 'done' and (new.due_date is distinct from old.due_date
                                   or new.due_time is distinct from old.due_time) then
        insert into notifications (user_id, task_id, type, actor_id, payload)
        values (case when uid = new.assignee_id then new.created_by else new.assignee_id end,
                new.id, 'date_changed', coalesce(uid, new.created_by),
                public.task_payload(new) || jsonb_build_object(
                  'old_due_date', old.due_date,
                  'old_due_time', to_char(old.due_time, 'HH24:MI')));
      end if;
    end if;
    return new;

  else  -- DELETE: si el banquero borra un pedido abierto, se le avisa a Tomás
    if old.created_by <> old.assignee_id and old.status <> 'done' then
      insert into notifications (user_id, task_id, type, actor_id, payload)
      values (old.assignee_id, null, 'cancelled', old.created_by, public.task_payload(old));
    end if;
    return old;
  end if;
end $$;

drop trigger if exists todomas_tasks_before_insert on public.tasks;
create trigger todomas_tasks_before_insert
  before insert on public.tasks
  for each row execute function public.tasks_before_insert();

drop trigger if exists todomas_tasks_before_update on public.tasks;
create trigger todomas_tasks_before_update
  before update on public.tasks
  for each row execute function public.tasks_before_update();

drop trigger if exists todomas_tasks_after_change on public.tasks;
create trigger todomas_tasks_after_change
  after insert or update or delete on public.tasks
  for each row execute function public.tasks_after_change();

-- Comentarios: avisan dentro de la app (sin email) a quien pidió y a quien lo hace
create or replace function public.comments_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, task_id, type, actor_id, payload)
  select distinct r.uid, t.id, 'comment', new.author_id,
         public.task_payload(t) || jsonb_build_object('comment', left(new.body, 280))
  from tasks t
  cross join lateral unnest(array[t.created_by, t.assignee_id]) as r(uid)
  where t.id = new.task_id and r.uid <> new.author_id;
  return new;
end $$;

drop trigger if exists todomas_comments_after_insert on public.task_comments;
create trigger todomas_comments_after_insert
  after insert on public.task_comments
  for each row execute function public.comments_after_insert();

-- Qué avisos van también por email
create or replace function public.notifications_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.type = 'comment' or not exists (
       select 1 from profiles p
       where p.id = new.user_id and p.active and p.email_notifications) then
    new.email_status := 'skipped';
  end if;
  return new;
end $$;

drop trigger if exists todomas_notifications_before_insert on public.notifications;
create trigger todomas_notifications_before_insert
  before insert on public.notifications
  for each row execute function public.notifications_before_insert();


-- =====================================================================
-- 6. La cola pública: todos ven que existe cada pedido, el detalle
--    solo quien puede verlo. Los privados no aparecen.
-- =====================================================================

drop function if exists public.get_queue(uuid);
create or replace function public.get_queue(p_receiver uuid)
returns table (
  task_id uuid,
  queue_pos integer,
  status text,
  priority smallint,
  due_date date,
  due_time time,
  requester_id uuid,
  is_request boolean,
  can_see boolean,
  title text,
  client text,
  created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select q.id, q.pos, q.status, q.priority, q.due_date, q.due_time, q.created_by,
         q.created_by <> q.assignee_id,
         q.can_see,
         case when q.can_see then q.title end,
         case when q.can_see then q.client end,
         q.created_at
  from (
    select t.*,
           (row_number() over (order by (t.status = 'doing') desc, t.position, t.created_at))::int as pos,
           (t.created_by = auth.uid() or t.assignee_id = auth.uid()
            or exists (select 1 from task_shares s where s.task_id = t.id and s.user_id = auth.uid())) as can_see
    from tasks t
    where t.assignee_id = p_receiver
      and t.status <> 'done'
      and not t.is_private
  ) q
  where public.is_active_user()
    and exists (select 1 from profiles r where r.id = p_receiver and r.accepts_requests)
  order by q.pos;
$$;


-- =====================================================================
-- 7. Tareas programadas: recurrentes, resumen diario y envío de emails
-- =====================================================================

create or replace function public.spawn_recurring(p_local timestamp) returns void
language plpgsql security definer set search_path = public as $$
declare
  d date := p_local::date;
  r record;
begin
  for r in
    select rt.*
    from recurring_tasks rt
    join profiles p on p.id = rt.owner_id and p.active
    where rt.active
      and rt.weekday = extract(isodow from d)::int
      -- si la recurrente se creó hoy después de su hora, parte la próxima semana
      and (rt.created_at < (d::timestamp at time zone public.app_tz())
           or rt.due_time is null
           or p_local::time < rt.due_time)
  loop
    insert into recurring_spawns (recurring_id, occurrence_date)
    values (r.id, d)
    on conflict do nothing;
    if found then
      insert into tasks (created_by, assignee_id, title, detail, due_date, due_time,
                         priority, is_private, recurring_id)
      values (r.owner_id, r.owner_id, r.title, r.detail, d, r.due_time,
              r.priority, r.is_private, r.id);
    end if;
  end loop;
end $$;

create or replace function public.run_morning(p_today date) returns void
language plpgsql security definer set search_path = public as $$
begin
  -- "Por vencer" (atrasados, hoy y mañana) para quienes no reciben pedidos
  insert into notifications (user_id, type, payload)
  select t.assignee_id, 'due_soon', jsonb_build_object(
           'count', count(*),
           'items', jsonb_agg(jsonb_build_object(
              'task_id', t.id, 'title', t.title, 'due_date', t.due_date,
              'due_time', to_char(t.due_time, 'HH24:MI'), 'priority', t.priority)
              order by t.due_date, t.due_time nulls last))
  from tasks t
  join profiles p on p.id = t.assignee_id and p.active and not p.accepts_requests
  where t.status <> 'done' and t.due_date is not null and t.due_date <= p_today + 1
  group by t.assignee_id;

  -- Resumen del día para quien recibe pedidos (incluye lo que vence)
  insert into notifications (user_id, type, payload)
  select p.id, 'digest', jsonb_build_object(
      'date', p_today,
      'open', (select count(*) from tasks t where t.assignee_id = p.id and t.status <> 'done'),
      'doing', (select count(*) from tasks t where t.assignee_id = p.id and t.status = 'doing'),
      'due_soon', (select count(*) from tasks t where t.assignee_id = p.id and t.status <> 'done'
                     and t.due_date <= p_today + 1),
      'new_24h', (select count(*) from tasks t where t.assignee_id = p.id and t.created_by <> p.id
                    and t.created_at > now() - interval '24 hours'),
      'items', coalesce((
        select jsonb_agg(x.item order by x.ord)
        from (
          select row_number() over (order by (t.status = 'doing') desc, t.position, t.created_at) as ord,
                 jsonb_build_object(
                   'task_id', t.id, 'title', t.title, 'status', t.status,
                   'due_date', t.due_date, 'due_time', to_char(t.due_time, 'HH24:MI'),
                   'priority', t.priority, 'client', t.client,
                   'requester_name', case when t.created_by <> t.assignee_id
                     then (select q.full_name from profiles q where q.id = t.created_by) end) as item
          from tasks t
          where t.assignee_id = p.id and t.status <> 'done'
          order by 1
          limit 20
        ) x), '[]'::jsonb))
  from profiles p
  where p.active and p.accepts_requests;
end $$;

create or replace function public.cron_minute() returns void
language plpgsql security definer set search_path = public as $$
declare
  local_now timestamp := now() at time zone public.app_tz();
  today date := local_now::date;
  base_url text;
begin
  perform public.spawn_recurring(local_now);

  -- 08:00 de lunes a viernes (hora de Chile)
  if extract(isodow from today) between 1 and 5
     and local_now::time >= time '08:00' and local_now::time < time '11:00' then
    insert into daily_jobs (job, run_date) values ('morning', today) on conflict do nothing;
    if found then
      perform public.run_morning(today);
    end if;
  end if;

  if exists (select 1 from notifications where email_status = 'pending') then
    select value into base_url from app_config where key = 'project_url';
    if coalesce(base_url, '') <> '' then
      perform net.http_post(
        url := rtrim(base_url, '/') || '/functions/v1/notify',
        body := '{}'::jsonb,
        headers := '{"Content-Type": "application/json"}'::jsonb,
        timeout_milliseconds := 25000);
    end if;
  end if;
end $$;

-- La función de email toma un lote de avisos pendientes (sin repetir envíos)
drop function if exists public.claim_pending_emails(integer);
create or replace function public.claim_pending_emails(max_rows integer default 40)
returns table (
  id bigint,
  type text,
  task_id uuid,
  payload jsonb,
  created_at timestamptz,
  recipient_email text,
  recipient_name text,
  lang text,
  actor_name text,
  actor_email text,
  attempts smallint
)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
begin
  -- avisos viejos (p. ej. de antes de configurar el email) no se mandan
  update notifications set email_status = 'skipped'
  where email_status = 'pending' and created_at < now() - interval '2 days';

  -- envíos que quedaron colgados se reintentan hasta 3 veces
  update notifications
  set email_status = case when email_attempts >= 3 then 'error' else 'pending' end
  where email_status = 'sending' and claimed_at < now() - interval '10 minutes';

  return query
  with picked as (
    select n.id from notifications n
    where n.email_status = 'pending'
    order by n.id
    limit max_rows
    for update skip locked
  ), upd as (
    update notifications n
    set email_status = 'sending', claimed_at = now(), email_attempts = n.email_attempts + 1
    from picked
    where n.id = picked.id
    returning n.*
  )
  select u.id, u.type, u.task_id, u.payload, u.created_at,
         p.email, p.full_name, p.lang, a.full_name, a.email, u.email_attempts
  from upd u
  join profiles p on p.id = u.user_id
  left join profiles a on a.id = u.actor_id;
end $$;


-- =====================================================================
-- 8. Permisos (RLS): quién ve y toca qué
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.invitations enable row level security;
alter table public.user_secrets enable row level security;
alter table public.recurring_tasks enable row level security;
alter table public.tasks enable row level security;
alter table public.task_shares enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_attachments enable row level security;
alter table public.notifications enable row level security;
alter table public.recurring_spawns enable row level security;
alter table public.daily_jobs enable row level security;
alter table public.app_config enable row level security;

-- profiles: todos los activos ven nombres y colores; cada uno edita lo suyo; el admin, todo
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (public.is_active_user() or id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- invitations: solo el admin
drop policy if exists invitations_admin on public.invitations;
create policy invitations_admin on public.invitations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- user_secrets: cada uno el suyo
drop policy if exists secrets_select on public.user_secrets;
create policy secrets_select on public.user_secrets for select to authenticated
  using (user_id = auth.uid());
drop policy if exists secrets_update on public.user_secrets;
create policy secrets_update on public.user_secrets for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- recurring_tasks: cada uno las suyas
drop policy if exists recurring_own on public.recurring_tasks;
create policy recurring_own on public.recurring_tasks for all to authenticated
  using (owner_id = auth.uid() and public.is_active_user())
  with check (owner_id = auth.uid() and public.is_active_user());

-- tasks: ves lo que creaste, lo que te toca hacer y lo que te compartieron (si no es privado).
-- Los privados los ve solo su dueño: ni el admin.
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks for select to authenticated
  using (public.is_active_user() and (
    created_by = auth.uid()
    or assignee_id = auth.uid()
    or (not is_private and public.is_shared_with_me(id))));
drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks for insert to authenticated
  with check (public.is_active_user() and created_by = auth.uid() and (
    assignee_id = auth.uid()
    or exists (select 1 from public.profiles p
               where p.id = assignee_id and p.active and p.accepts_requests)));
drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks for update to authenticated
  using (public.is_active_user() and (created_by = auth.uid() or assignee_id = auth.uid()))
  with check (created_by = auth.uid() or assignee_id = auth.uid());
drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks for delete to authenticated
  using (public.is_active_user() and created_by = auth.uid());

-- task_shares: los ve quien ve el pendiente; solo su creador decide con quién compartir
drop policy if exists shares_select on public.task_shares;
create policy shares_select on public.task_shares for select to authenticated
  using (user_id = auth.uid() or public.can_see_task(task_id));
drop policy if exists shares_insert on public.task_shares;
create policy shares_insert on public.task_shares for insert to authenticated
  with check (public.is_task_creator(task_id) and user_id <> auth.uid());
drop policy if exists shares_delete on public.task_shares;
create policy shares_delete on public.task_shares for delete to authenticated
  using (public.is_task_creator(task_id));

-- comentarios: los lee y escribe quien ve el pendiente
drop policy if exists comments_select on public.task_comments;
create policy comments_select on public.task_comments for select to authenticated
  using (public.can_see_task(task_id));
drop policy if exists comments_insert on public.task_comments;
create policy comments_insert on public.task_comments for insert to authenticated
  with check (author_id = auth.uid() and public.can_see_task(task_id));
drop policy if exists comments_delete on public.task_comments;
create policy comments_delete on public.task_comments for delete to authenticated
  using (author_id = auth.uid());

-- adjuntos: los ve quien ve el pendiente; suben quien lo creó o quien lo hace
drop policy if exists attachments_select on public.task_attachments;
create policy attachments_select on public.task_attachments for select to authenticated
  using (public.can_see_task(task_id));
drop policy if exists attachments_insert on public.task_attachments;
create policy attachments_insert on public.task_attachments for insert to authenticated
  with check (uploaded_by = auth.uid() and public.can_edit_task(task_id));
drop policy if exists attachments_delete on public.task_attachments;
create policy attachments_delete on public.task_attachments for delete to authenticated
  using (uploaded_by = auth.uid());

-- avisos: cada uno los suyos
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications for delete to authenticated
  using (user_id = auth.uid());

-- Permisos explícitos. Desde 2026 Supabase ya no expone las tablas nuevas
-- automáticamente: sin estos "grant" la app recibe "permission denied".
-- Quién ve qué fila lo siguen decidiendo las reglas RLS de arriba.
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on
  public.profiles, public.invitations, public.user_secrets, public.recurring_tasks,
  public.tasks, public.task_shares, public.task_comments, public.task_attachments,
  public.notifications
  to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
revoke all on public.app_config, public.daily_jobs, public.recurring_spawns from anon, authenticated;
grant execute on function
  public.is_active_user(), public.is_admin(), public.is_shared_with_me(uuid),
  public.can_see_task(uuid), public.can_edit_task(uuid), public.is_task_creator(uuid),
  public.task_id_from_path(text), public.app_tz()
  to authenticated, service_role;

-- Funciones internas: no se pueden llamar desde la app
revoke execute on function public.cron_minute() from public, anon, authenticated;
revoke execute on function public.run_morning(date) from public, anon, authenticated;
revoke execute on function public.spawn_recurring(timestamp) from public, anon, authenticated;
revoke execute on function public.claim_pending_emails(integer) from public, anon, authenticated;
revoke execute on function public.auto_position(uuid, date, time, smallint, uuid) from public, anon, authenticated;
revoke execute on function public.task_payload(public.tasks) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.claim_pending_emails(integer) to service_role;
revoke execute on function public.get_queue(uuid) from public, anon;
grant execute on function public.get_queue(uuid) to authenticated;


-- =====================================================================
-- 9. Archivos adjuntos (bucket privado, máx. 10 MB por archivo)
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 10485760)
on conflict (id) do nothing;

drop policy if exists "todomas attachments read" on storage.objects;
create policy "todomas attachments read" on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and public.can_see_task(public.task_id_from_path(name)));
drop policy if exists "todomas attachments write" on storage.objects;
create policy "todomas attachments write" on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and public.can_edit_task(public.task_id_from_path(name)));
drop policy if exists "todomas attachments delete" on storage.objects;
create policy "todomas attachments delete" on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and owner_id = auth.uid()::text);


-- =====================================================================
-- 10. Tiempo real (la app se actualiza sola) y cron cada minuto
-- =====================================================================

do $$
begin
  alter publication supabase_realtime add table public.tasks;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.task_comments;
exception when duplicate_object then null;
end $$;

select cron.schedule('todomas-cada-minuto', '* * * * *', 'select public.cron_minute()');
