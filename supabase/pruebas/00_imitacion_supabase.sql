-- Imitación mínima del entorno Supabase para probar el esquema
do $$ begin create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
create schema auth; create schema storage; create schema extensions; create schema cron; create schema net;
create table auth.users (id uuid primary key default gen_random_uuid(), email text);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner_id text default auth.uid()::text);
alter table storage.objects enable row level security;
create publication supabase_realtime;
create table cron.jobs (name text primary key, sched text, cmd text);
create function cron.schedule(n text, s text, c text) returns bigint language sql as $$
  insert into cron.jobs values (n, s, c) on conflict (name) do update set sched = excluded.sched, cmd = excluded.cmd; select 1::bigint $$;
create table net.calls (url text, at timestamptz default now());
create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
returns bigint language sql as $$ insert into net.calls(url) values (url); select 1::bigint $$;
grant usage on schema public, auth, storage to anon, authenticated, service_role;
grant all on all tables in schema storage to authenticated, service_role;
