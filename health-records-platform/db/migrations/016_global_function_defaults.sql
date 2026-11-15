-- 013 used ALTER DEFAULT PRIVILEGES ... IN SCHEMA, which can only ADD
-- privileges — it cannot remove the global default that grants EXECUTE to
-- PUBLIC on new functions. Revoke the global default for the migration owner,
-- and close everything created since 013.
alter default privileges revoke execute on functions from public;
revoke execute on all functions in schema app from public, anon;
grant execute on all functions in schema app to service_role;
