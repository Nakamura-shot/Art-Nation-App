-- Art Nation V31 - teacher Messenger identity extensions.
-- Forward-only and safely rerunnable after V30 and the existing Messenger migrations.
alter table teachers add column if not exists messenger_psid text;
alter table teachers add column if not exists messenger_connected_at timestamptz;
alter table teachers add column if not exists messenger_transactional_opt_in boolean not null default true;
alter table teachers add column if not exists messenger_consent_at timestamptz;

alter table messenger_connection_tokens
  add column if not exists teacher_id uuid references teachers(id) on delete cascade;

alter table messenger_messages
  add column if not exists teacher_id uuid references teachers(id) on delete set null;

create unique index if not exists teachers_messenger_psid_unique
  on teachers(messenger_psid) where messenger_psid is not null;
create index if not exists idx_messenger_connection_tokens_teacher
  on messenger_connection_tokens(teacher_id, created_at desc);
create index if not exists idx_messenger_messages_teacher_created
  on messenger_messages(teacher_id, created_at desc);
