-- Admin views of institution verification documents are privileged actions: audit them.
create or replace function app.log_institution_document_view(p_document uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_inst uuid;
begin
  select institution_id into v_inst from institution_documents where id = p_document;
  if v_inst is null then return; end if;
  perform app.audit('institution.document_viewed', 'institution_document', p_document::text, null, v_inst, '{}');
end $$;
grant execute on function app.log_institution_document_view(uuid) to authenticated;
