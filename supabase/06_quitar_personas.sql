-- =====================================================================
--  TODOmás · 06_quitar_personas.sql
--  Córrelo una vez en el SQL Editor (también quedó incluido en 01_esquema.sql).
-- =====================================================================

-- =====================================================================
-- 12. Quitar a alguien de TODOmás (lo llama la función remove-user)
--     Borra sus pendientes (incluidos los privados), los pedidos que hizo,
--     sus comentarios, adjuntos y avisos, y su invitación. Devuelve las
--     rutas de los archivos para que la función los borre del storage.
--     La cuenta (auth) la borra la función con permisos de admin.
-- =====================================================================

create or replace function public.admin_purge_user(p_user uuid, p_admin uuid) returns text[]
language plpgsql security definer set search_path = public as $$
declare
  target public.profiles;
  paths text[];
begin
  if p_user = p_admin then
    raise exception 'TODOMAS_CANNOT_REMOVE_SELF';
  end if;
  if not exists (select 1 from profiles where id = p_admin and role = 'admin' and active) then
    raise exception 'TODOMAS_FORBIDDEN';
  end if;
  select * into target from profiles where id = p_user;
  if not found then
    return '{}';
  end if;

  select coalesce(array_agg(distinct a.storage_path), '{}') into paths
  from task_attachments a
  join tasks t on t.id = a.task_id
  where a.uploaded_by = p_user or t.created_by = p_user or t.assignee_id = p_user;

  delete from task_attachments a using tasks t
  where t.id = a.task_id and (a.uploaded_by = p_user or t.created_by = p_user or t.assignee_id = p_user);
  delete from task_comments where author_id = p_user;
  delete from tasks where created_by = p_user or assignee_id = p_user;
  -- después de borrar los pedidos (el borrado genera avisos de "cancelado")
  delete from notifications where actor_id = p_user or user_id = p_user;
  update password_reset_requests set resolved_by = null where resolved_by = p_user;
  delete from invitations where email = target.email;
  return paths;
end $$;

revoke execute on function public.admin_purge_user(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_purge_user(uuid, uuid) to service_role;

-- Verificación
select count(*) as funcion_ok from pg_proc where proname = 'admin_purge_user';
