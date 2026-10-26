-- =====================================================================
--  TODOmás · 04_emails_apagados.sql
--  Agrega el interruptor general de emails y lo deja APAGADO.
--  Los avisos siguen llegando dentro de la app (campana).
--  Para prenderlo más adelante (con SMTP_USER / SMTP_PASSWORD cargados):
--    update public.app_config set value = 'true' where key = 'emails_enabled';
-- =====================================================================

create or replace function public.emails_enabled() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select value from app_config where key = 'emails_enabled'), 'true') <> 'false';
$$;

create or replace function public.app_settings() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('emails_enabled', public.emails_enabled());
$$;

create or replace function public.notifications_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.type = 'comment' or not public.emails_enabled() or not exists (
       select 1 from profiles p
       where p.id = new.user_id and p.active and p.email_notifications) then
    new.email_status := 'skipped';
  end if;
  return new;
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

  if public.emails_enabled() and exists (select 1 from notifications where email_status = 'pending') then
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

grant execute on function public.emails_enabled(), public.app_settings() to authenticated, service_role;
revoke execute on function public.cron_minute() from public, anon, authenticated;

insert into public.app_config (key, value) values ('emails_enabled', 'false')
on conflict (key) do update set value = excluded.value;

-- Lo que estaba en cola por email queda descartado (sigue visible en la campana)
update public.notifications set email_status = 'skipped', email_error = null
where email_status in ('pending', 'sending', 'error');

-- Verificación
select public.app_settings() as ajustes,
       (select count(*) from public.notifications where email_status = 'pending') as emails_en_cola;
