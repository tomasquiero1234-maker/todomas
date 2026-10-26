-- =====================================================================
--  TODOmás · 02_configuracion.sql
--  Cambia los valores marcados con  <<<  y córrelo en el SQL Editor.
-- =====================================================================

-- URL de tu proyecto Supabase (Project Settings → API → Project URL)
insert into public.app_config (key, value)
values ('project_url', 'https://lbyztwnzebkesvhuvdfi.supabase.co')
on conflict (key) do update set value = excluded.value;

-- URL pública de la app en GitHub Pages (se usa en los links de los emails)
insert into public.app_config (key, value)
values ('app_url', 'https://tomasquiero1234-maker.github.io/todomas/')
on conflict (key) do update set value = excluded.value;

-- Zona horaria de los recordatorios y recurrentes
insert into public.app_config (key, value)
values ('timezone', 'America/Santiago')
on conflict (key) do update set value = excluded.value;

-- Tú como administrador y quien recibe los pedidos
insert into public.invitations (email, full_name, role, accepts_requests, color)
values (lower('tu.correo@empresa.com'),                              -- <<<
        'Tomás',                                                     -- <<<
        'admin', true, '#2a78d6')
on conflict (email) do update
  set full_name = excluded.full_name, role = 'admin', accepts_requests = true;
