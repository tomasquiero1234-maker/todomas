-- =====================================================================
--  TODOmás · 03_recurrentes.sql
--  Córrelo DESPUÉS de crear tu cuenta en la app. Carga tus dos
--  pendientes semanales al admin (después los editas en Ajustes → Recurrentes).
-- =====================================================================

with yo as (
  select id from public.profiles where role = 'admin' order by created_at limit 1
)
insert into public.recurring_tasks (owner_id, title, detail, weekday, due_time, priority)
select yo.id, v.title, v.detail, v.weekday, v.due_time::time, v.priority
from yo, (values
  ('Subir el acta del pipeline', 'Después de la reunión de pipeline (termina a las 12:00).', 1, '12:00', 3),
  ('Mandar el mail de noticias de la semana', null, 5, '17:00', 2)
) as v(title, detail, weekday, due_time, priority)
where not exists (
  select 1 from public.recurring_tasks r where r.owner_id = yo.id and r.title = v.title
);

-- Verificación
select r.title as recurrente, r.weekday as dia, to_char(r.due_time, 'HH24:MI') as hora
from public.recurring_tasks r order by r.weekday;
