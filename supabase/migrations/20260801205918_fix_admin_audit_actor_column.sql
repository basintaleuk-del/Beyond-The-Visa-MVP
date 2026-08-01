-- Align the shared admin trigger with the production audit table contract.
-- Trigger execution remains internal; browser roles cannot call it directly.

create or replace function public.btv_audit_admin_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb;
  row_id text;
begin
  if not public.btv_is_admin() then
    return coalesce(new, old);
  end if;

  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  row_id := coalesce(row_data->>'id', row_data->>'code', row_data->>'user_id');

  insert into public.admin_audit_logs(admin_id, action, target_type, target_id, details)
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    row_id,
    jsonb_build_object('record', row_data)
  );

  return coalesce(new, old);
end;
$$;

revoke execute on function public.btv_audit_admin_change() from public, anon, authenticated;
