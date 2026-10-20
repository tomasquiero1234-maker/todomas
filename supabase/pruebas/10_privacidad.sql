\set ON_ERROR_STOP 1
\set QUIET 1
-- Personas: T = Tomás (admin, recibe pedidos), K = Karime, B = banquero B
insert into invitations (email, full_name, role, accepts_requests, color) values
 ('tomas@x.com','Tomás','admin',true,'#2a78d6'), ('karime@x.com','Karime','banker',false,'#eb6834'), ('b@x.com','Banquero B','banker',false,'#1baf7a');
insert into auth.users (id, email) values
 ('11111111-1111-1111-1111-111111111111','Tomas@X.com'),
 ('22222222-2222-2222-2222-222222222222','karime@x.com'),
 ('33333333-3333-3333-3333-333333333333','b@x.com');
do $$ begin
  begin insert into auth.users (id, email) values ('44444444-4444-4444-4444-444444444444','intruso@x.com');
        raise exception 'FALLO: un correo no invitado pudo registrarse';
  exception when raise_exception then
    if sqlerrm <> 'TODOMAS_NOT_INVITED' then raise; end if;
  end;
  assert (select count(*) from profiles) = 3, 'deberían existir 3 perfiles';
  assert (select count(*) from user_secrets) = 3, 'cada perfil tiene token de calendario';
  raise notice 'OK  1. solo correos invitados crean cuenta';
end $$;

-- ===== Karime crea: un pedido a Tomás, una tarea compartida con Tomás y una privada
set role authenticated; select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false) \g /dev/null
insert into tasks (id, created_by, assignee_id, title, client, due_date, priority, is_private) values
 ('a0000000-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','Ficha cliente Alfa','Cliente Alfa', current_date + 1, 3, true)
 returning id \g /dev/null
insert into tasks (id, created_by, assignee_id, title, due_date) values
 ('a0000000-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','22222222-2222-2222-2222-222222222222','Llamar a cliente Beta', current_date),
 ('a0000000-0000-0000-0000-000000000003','22222222-2222-2222-2222-222222222222','22222222-2222-2222-2222-222222222222','Trámite personal de Karime', current_date);
update tasks set is_private = true where id = 'a0000000-0000-0000-0000-000000000003';
insert into task_shares values ('a0000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111');
do $$ begin
  assert (select is_private from tasks where id='a0000000-0000-0000-0000-000000000001') = false, 'un pedido nunca es privado';
  begin
    insert into tasks (created_by, assignee_id, title) values ('22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333','Pedido a B');
    raise exception 'FALLO: se pudo pedir algo a alguien que no recibe pedidos';
  exception when insufficient_privilege then null; end;
  begin
    insert into tasks (created_by, assignee_id, title) values ('11111111-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111','Suplantando a Tomás');
    raise exception 'FALLO: se pudo crear un pendiente a nombre de otro';
  exception when insufficient_privilege then null; end;
  raise notice 'OK  2. pedidos: no privados, solo a quien recibe pedidos, sin suplantar';
end $$;

-- ===== Banquero B: su propio pedido; no ve nada de Karime; en la cola ve que existen, sin detalle
select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',false) \g /dev/null
insert into tasks (id, created_by, assignee_id, title, due_date, priority) values
 ('b0000000-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','Cotización bono', current_date + 5, 2);
do $$ declare n int; begin
  assert (select count(*) from tasks) = 1, 'B solo debería ver su pedido, ve ' || (select count(*) from tasks);
  select count(*) into n from get_queue('11111111-1111-1111-1111-111111111111');
  assert n = 2, 'la cola de Tomás debería tener 2 pedidos, tiene ' || n;
  assert (select title from get_queue('11111111-1111-1111-1111-111111111111') where task_id='a0000000-0000-0000-0000-000000000001') is null, 'B NO debe ver el título del pedido de Karime';
  assert (select title from get_queue('11111111-1111-1111-1111-111111111111') where task_id='b0000000-0000-0000-0000-000000000001') = 'Cotización bono', 'B ve el título de su pedido';
  assert (select queue_pos from get_queue('11111111-1111-1111-1111-111111111111') where task_id='a0000000-0000-0000-0000-000000000001') = 1, 'el de Karime (vence antes) va 1º';
  assert (select count(*) from get_queue('22222222-2222-2222-2222-222222222222')) = 0, 'no se puede espiar la cola de quien no recibe pedidos';
  assert (select count(*) from task_comments) = 0;
  raise notice 'OK  3. B no ve detalle ajeno; en la cola ve "pedido de Karime" sin título; orden por fecha';
end $$;

-- ===== Tomás: ve los 2 pedidos + la tarea compartida de Karime, NO la privada
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false) \g /dev/null
insert into tasks (id, created_by, assignee_id, title, is_private, due_date) values
 ('c0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111','Médico (privado)', true, current_date),
 ('c0000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111','Preparar comité', false, current_date + 2);
do $$ begin
  assert (select count(*) from tasks where created_by <> auth.uid()) = 3, 'Tomás ve 2 pedidos + 1 compartida';
  assert not exists (select 1 from tasks where id='a0000000-0000-0000-0000-000000000003'), 'Tomás NO debe ver la privada de Karime';
  raise notice 'OK  4. Tomás (admin) ve lo compartido pero no lo privado de Karime';
end $$;
select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',false) \g /dev/null
do $$ begin
  assert (select count(*) from get_queue('11111111-1111-1111-1111-111111111111')) = 3, 'B ve 3 en la cola (2 pedidos + tarea no privada de Tomás)';
  assert not exists (select 1 from get_queue('11111111-1111-1111-1111-111111111111') where task_id='c0000000-0000-0000-0000-000000000001'), 'la privada de Tomás NO aparece en la cola';
  assert (select title from get_queue('11111111-1111-1111-1111-111111111111') where task_id='c0000000-0000-0000-0000-000000000002') is null, 'tarea de Tomás sin detalle';
  raise notice 'OK  5. los privados de Tomás no aparecen ni en el conteo; sus tareas de trabajo, sin detalle';
end $$;

-- ===== Reglas de edición
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false) \g /dev/null
do $$ begin
  begin update tasks set status='done' where id='a0000000-0000-0000-0000-000000000001';
        raise exception 'FALLO: el banquero movió el estado';
  exception when raise_exception then if sqlerrm <> 'TODOMAS_ONLY_ASSIGNEE' then raise; end if; end;
  update tasks set priority = 1 where id='a0000000-0000-0000-0000-000000000001';
  begin update profiles set role='admin' where id=auth.uid();
        raise exception 'FALLO: un banquero se hizo admin';
  exception when raise_exception then if sqlerrm <> 'TODOMAS_FORBIDDEN' then raise; end if; end;
  update tasks set title = 'hackeado' where id = 'b0000000-0000-0000-0000-000000000001';
  raise notice 'OK  6. el banquero edita su pedido pero no mueve el estado ni se sube de rol';
end $$;
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false) \g /dev/null
do $$ begin
  assert (select title from tasks where id='b0000000-0000-0000-0000-000000000001') = 'Cotización bono', 'Karime NO pudo editar el pedido de B';
  begin update tasks set title='otro' where id='a0000000-0000-0000-0000-000000000001';
        raise exception 'FALLO: Tomás cambió el título del pedido';
  exception when raise_exception then if sqlerrm <> 'TODOMAS_ONLY_REQUESTER' then raise; end if; end;
  update tasks set status='doing' where id='a0000000-0000-0000-0000-000000000001';
  update tasks set due_date = current_date + 3 where id='a0000000-0000-0000-0000-000000000001';
  update tasks set status='done', done_note='Listo, va adjunto' where id='a0000000-0000-0000-0000-000000000001';
  assert (select started_at is not null and completed_at is not null from tasks where id='a0000000-0000-0000-0000-000000000001'), 'fechas de inicio y término';
  raise notice 'OK  7. Tomás mueve el estado y la fecha, no el contenido';
end $$;

-- Comentario de Karime y cancelación de B
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false) \g /dev/null
insert into task_comments (task_id, author_id, body) values ('a0000000-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','¡Gracias!');
select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',false) \g /dev/null
do $$ begin
  begin insert into task_comments (task_id, author_id, body) values ('a0000000-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','metiche');
        raise exception 'FALLO: B comentó en un pedido ajeno';
  exception when insufficient_privilege then null; end;
end $$;
delete from tasks where id='b0000000-0000-0000-0000-000000000001';
reset role;
do $$ begin
  assert (select array_agg(type order by id)::text from notifications where user_id='22222222-2222-2222-2222-222222222222') = '{date_changed,done}', 'Karime: aviso de cambio de fecha y de done';
  assert (select array_agg(type order by id)::text from notifications where user_id='11111111-1111-1111-1111-111111111111') = '{new_request,new_request,comment,cancelled}', 'Tomás: 2 pedidos, 1 comentario, 1 cancelación: ' || (select array_agg(type order by id)::text from notifications where user_id='11111111-1111-1111-1111-111111111111');
  assert (select email_status from notifications where type='comment') = 'skipped', 'comentarios sin email';
  assert (select count(*) from notifications where email_status='pending') = 5, 'los otros 5 van por email';
  raise notice 'OK  8. avisos: pedido nuevo, cambio de fecha, done, comentario (sin email) y cancelación';
end $$;

-- ===== Compartir el detalle de un pedido con otra persona
set role authenticated; select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false) \g /dev/null
insert into tasks (id, created_by, assignee_id, title, due_date) values
 ('a0000000-0000-0000-0000-000000000009','22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','Presentación conjunta', current_date + 4);
insert into task_shares values ('a0000000-0000-0000-0000-000000000009','33333333-3333-3333-3333-333333333333');
select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',false) \g /dev/null
do $$ begin
  assert (select title from get_queue('11111111-1111-1111-1111-111111111111') where task_id='a0000000-0000-0000-0000-000000000009') = 'Presentación conjunta', 'B ve el detalle porque Karime se lo compartió';
  assert exists (select 1 from tasks where id='a0000000-0000-0000-0000-000000000009');
  begin update tasks set title='x' where id='a0000000-0000-0000-0000-000000000009';
    if found then raise exception 'FALLO: un invitado a ver pudo editar'; end if;
  end;
  begin insert into task_shares values ('a0000000-0000-0000-0000-000000000009','11111111-1111-1111-1111-111111111111');
        raise exception 'FALLO: B compartió algo que no es suyo';
  exception when insufficient_privilege then null; end;
  raise notice 'OK  9. compartir: B ve el detalle, pero no puede editar ni re-compartir';
end $$;

-- ===== Archivos: solo en pendientes que puedo editar
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false) \g /dev/null
insert into storage.objects (bucket_id, name) values ('attachments','a0000000-0000-0000-0000-000000000009/plan.pdf');
select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',false) \g /dev/null
do $$ begin
  begin insert into storage.objects (bucket_id, name) values ('attachments','a0000000-0000-0000-0000-000000000002/x.pdf');
        raise exception 'FALLO: B subió un archivo a una tarea ajena';
  exception when insufficient_privilege then null; end;
  assert (select count(*) from storage.objects) = 1, 'B ve el archivo del pedido compartido';
  raise notice 'OK 10. archivos protegidos por las mismas reglas';
end $$;
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false) \g /dev/null
do $$ begin
  assert (select count(*) from storage.objects) = 1;
end $$;

-- ===== Desactivar a alguien
update profiles set active = false where id = '33333333-3333-3333-3333-333333333333';
do $$ begin
  begin update profiles set active=false where id=auth.uid(); raise exception 'FALLO';
  exception when raise_exception then if sqlerrm <> 'TODOMAS_CANNOT_DEMOTE_SELF' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',false) \g /dev/null
do $$ begin
  assert (select count(*) from tasks) = 0, 'un desactivado no ve nada';
  assert (select count(*) from get_queue('11111111-1111-1111-1111-111111111111')) = 0;
  assert (select count(*) from profiles) = 1, 'solo ve su propio perfil (para mostrarle el aviso)';
  raise notice 'OK 11. un usuario desactivado pierde el acceso';
end $$;

-- ===== Funciones internas no se llaman desde la app
do $$ begin
  begin perform cron_minute(); raise exception 'FALLO: la app pudo correr el cron';
  exception when insufficient_privilege then null; end;
  begin perform * from claim_pending_emails(5); raise exception 'FALLO: la app pudo leer la cola de emails';
  exception when insufficient_privilege then null; end;
  raise notice 'OK 12. cron y cola de emails cerrados para la app';
end $$;
reset role;
