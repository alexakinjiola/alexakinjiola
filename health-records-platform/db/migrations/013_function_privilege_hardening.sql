-- PostgreSQL grants EXECUTE to PUBLIC on every new function by default.
-- 006 revoked that for functions existing at the time; functions added later
-- (008–012) silently regained it. Revoke again for everything in `app`, and
-- change the default so future migrations start closed. Explicit grants to
-- `authenticated` / `service_role` are unaffected.
revoke execute on all functions in schema app from public, anon;
alter default privileges in schema app revoke execute on functions from public;
grant execute on all functions in schema app to service_role;
-- Belt and braces: ingestion is server-only.
revoke execute on function app.integration_ingest(text, text, jsonb) from authenticated;
