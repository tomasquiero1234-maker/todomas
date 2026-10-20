\set ON_ERROR_STOP 1
\set QUIET 1
insert into app_config values ('project_url','https://demo.supabase.co');
-- Recurrente de Tomás para hoy a las 23:59, creada "ayer"
insert into recurring_tasks (id, owner_id, title, weekday, due_time, priority, created_at)
values ('d0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Mail de noticias',
        extract(isodow from (now() at time zone 'America/Santiago')::date)::int, '23:59', 2, now() - interval '1 day');
-- Recurrente creada hoy pero cuya hora ya pasó: no debe partir hoy
insert into recurring_tasks (owner_id, title, weekday, due_time)
values ('11111111-1111-1111-1111-111111111111','Ya pasó la hora',
        extract(isodow from (now() at time zone 'America/Santiago')::date)::int, '00:00');
select cron_minute() \g /dev/null
select cron_minute() \g /dev/null
do $$ begin
  assert (select count(*) from tasks where recurring_id = 'd0000000-0000-0000-0000-000000000001') = 1, 'la recurrente se crea una sola vez';
  assert (select count(*) from tasks where title = 'Ya pasó la hora') = 0, 'no se crea si la hora ya pasó el día que se configuró';
  delete from tasks where recurring_id = 'd0000000-0000-0000-0000-000000000001';
  perform cron_minute();
  assert (select count(*) from tasks where recurring_id = 'd0000000-0000-0000-0000-000000000001') = 0, 'si la borro, no reaparece';
  assert (select count(*) from net.calls) >= 1, 'hay emails pendientes → se llamó a la función notify';
  assert (select url from net.calls limit 1) = 'https://demo.supabase.co/functions/v1/notify';
  raise notice 'OK 13. recurrentes: una por semana, respetan la hora y no reaparecen si se borran';
end $$;
select count(*) as resumenes_que_ya_mando_el_cron from notifications where type in ('digest','due_soon');
delete from notifications where type in ('digest','due_soon');
select run_morning((now() at time zone 'America/Santiago')::date) \g /dev/null
do $$ declare d jsonb; begin
  select payload into d from notifications where type='digest' and user_id='11111111-1111-1111-1111-111111111111';
  assert d is not null, 'Tomás recibe el resumen del día';
  assert (d->>'open')::int = (select count(*) from tasks where assignee_id='11111111-1111-1111-1111-111111111111' and status<>'done'), 'resumen cuenta los abiertos';
  assert (select count(*) from notifications where type='due_soon' and user_id='22222222-2222-2222-2222-222222222222') = 1, 'Karime recibe un solo email de por vencer';
  assert (select (payload->>'count')::int from notifications where type='due_soon') = 2, 'con sus 2 pendientes de hoy';
  raise notice 'OK 14. resumen diario para Tomás y "por vencer" agrupado para Karime: %', d->>'open';
end $$;
set role service_role;
do $$ declare n int; m int; begin
  select count(*) into n from claim_pending_emails(40);
  select count(*) into m from claim_pending_emails(40);
  assert n > 0 and m = 0, format('el lote se toma una sola vez (%s, luego %s)', n, m);
  raise notice 'OK 15. la cola de emails entrega % avisos y no los repite', n;
end $$;
reset role;
select type, email_status, (select email from profiles where id=user_id) as para, payload->>'title' as titulo from notifications order by id;
-- orden automático: entra por fecha y prioridad entre los pendientes
set role authenticated; select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false) \g /dev/null
insert into tasks (id, created_by, assignee_id, title, due_date, priority) values
 ('e0000000-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','Urgente para hoy', current_date, 3),
 ('e0000000-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','Sin fecha', null, 3);
select queue_pos, coalesce(title, '(sin detalle)') as titulo, due_date, priority from get_queue('11111111-1111-1111-1111-111111111111');
reset role;
