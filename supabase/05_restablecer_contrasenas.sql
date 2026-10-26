-- =====================================================================
--  TODOmás · 05_restablecer_contrasenas.sql
--  Córrelo una vez en el SQL Editor (también quedó incluido en 01_esquema.sql).
-- =====================================================================

-- =====================================================================
-- 11. Restablecer contraseñas sin email (solo si la persona lo pide)
--     1) En el login, la persona pide una contraseña nueva.
--     2) Al admin le llega un aviso; en Usuarios toca "Restablecer".
--     3) La función reset-password genera una temporal; al entrar,
--        la app obliga a elegir una nueva.
-- =====================================================================

alter table public.profiles add column if not exists must_change_password boolean not null default false;

create table if not exists public.password_reset_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id)
);
create unique index if not exists password_reset_requests_pending_idx
  on public.password_reset_requests (user_id) where resolved_at is null;
alter table public.password_reset_requests enable row level security;
drop policy if exists reset_requests_admin on public.password_reset_requests;
create policy reset_requests_admin on public.password_reset_requests for select to authenticated
  using (public.is_admin());
grant select on public.password_reset_requests to authenticated;
grant select, insert, update, delete on public.password_reset_requests to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in
  ('new_request', 'done', 'date_changed', 'cancelled', 'comment', 'due_soon', 'digest', 'reset_request'));

-- La llama la pantalla de login (sin sesión). Nunca dice si el correo existe.
create or replace function public.request_password_reset(p_email text) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
begin
  select id into uid from profiles where email = lower(trim(p_email)) and active;
  if uid is null then
    return;
  end if;
  if exists (select 1 from password_reset_requests where user_id = uid and resolved_at is null) then
    update password_reset_requests set requested_at = now() where user_id = uid and resolved_at is null;
    return;
  end if;
  insert into password_reset_requests (user_id) values (uid);
  insert into notifications (user_id, type, actor_id, payload)
  select a.id, 'reset_request', uid, jsonb_build_object('name', (select full_name from profiles where id = uid))
  from profiles a
  where a.role = 'admin' and a.active and a.id <> uid;
end $$;

grant usage on schema public to anon;
revoke execute on function public.request_password_reset(text) from public;
grant execute on function public.request_password_reset(text) to anon, authenticated;
grant execute on function public.app_settings() to anon;

-- Verificación
select (select count(*) from information_schema.columns where table_name = 'profiles' and column_name = 'must_change_password') as columna_ok,
       (select count(*) from pg_proc where proname = 'request_password_reset') as funcion_ok,
       (select count(*) from public.password_reset_requests) as solicitudes;
