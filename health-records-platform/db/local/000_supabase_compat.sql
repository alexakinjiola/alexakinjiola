-- ---------------------------------------------------------------------------
-- LOCAL / NON-SUPABASE POSTGRES ONLY.
-- Supabase already provides these roles and extensions. Do NOT run this file
-- against a Supabase project.
--
-- Mirrors the Supabase role model so the same migrations and RLS policies work
-- unchanged in both environments:
--   anon           unauthenticated requests
--   authenticated  signed-in users; RLS applies
--   service_role   trusted server code (auth module, jobs); bypasses RLS
-- The application login role switches into one of these per transaction with
-- SET LOCAL ROLE, exactly as PostgREST does.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'continuum_app') then
    -- Development-only password. Production credentials come from the secret manager.
    create role continuum_app login password 'continuum_dev_only' noinherit;
  end if;
end $$;

grant anon, authenticated, service_role to continuum_app;

create extension if not exists pgcrypto;
create extension if not exists citext;
