-- Retry scheduling for the outbox delivery worker.
alter table message_outbox add column next_attempt_at timestamptz not null default now();
create index message_outbox_due_idx on message_outbox(next_attempt_at) where status = 'queued';
