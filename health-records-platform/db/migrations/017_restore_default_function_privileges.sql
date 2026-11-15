-- 016's GLOBAL default-privilege revoke was too broad: extension functions
-- (citext, pgcrypto) recreated after a reset lost PUBLIC execute, breaking
-- queries. Restore PostgreSQL's normal default and re-grant extension
-- functions. The app schema is instead closed by the migration runner after
-- every run (scripts/migrate.ts), and a regression test enforces it.
alter default privileges grant execute on functions to public;
grant execute on all functions in schema public to public;
