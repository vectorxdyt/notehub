-- Run once in your Supabase project's SQL Editor.
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  topic text not null check (char_length(topic) between 1 and 40),
  date date not null,
  description text not null default '' check (char_length(description) <= 1000),
  key_ideas text not null default '' check (char_length(key_ideas) <= 1500),
  key_ideas_source text check (key_ideas_source in ('teacher','ai-draft')),
  images jsonb not null check (jsonb_typeof(images) = 'array' and jsonb_array_length(images) between 1 and 8),
  created_at timestamptz not null default now()
);
alter table public.lessons add column if not exists key_ideas text not null default '' check (char_length(key_ideas) <= 1500);
alter table public.lessons add column if not exists key_ideas_source text check (key_ideas_source in ('teacher','ai-draft'));
alter table public.lessons enable row level security;
-- All table access goes through authenticated server routes using the service role.
revoke all on public.lessons from anon, authenticated;
grant all on public.lessons to service_role;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('notes','notes',true,3200000,array['image/jpeg'])
on conflict(id) do update set public=true,file_size_limit=3200000,allowed_mime_types=array['image/jpeg'];
-- Public bucket permits reading images; writes require the server's service key.
