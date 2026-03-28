-- Awrella Supabase schema
-- Run this in Supabase SQL editor (safe to rerun).

create extension if not exists "pgcrypto";

DO $$
BEGIN
  CREATE TYPE user_role AS ENUM ('USER', 'SUPER_ADMIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END$$;

DO $$
BEGIN
  CREATE TYPE note_color AS ENUM ('CREAM', 'BLUE', 'BLUSH', 'SAGE');
EXCEPTION
  WHEN duplicate_object THEN null;
END$$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password text not null,
  name text,
  role user_role not null default 'USER',
  is_active boolean not null default true,
  approval_status text not null default 'APPROVED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users add column if not exists avatar_url text;
alter table public.users add column if not exists auth_provider text not null default 'password';
alter table public.users add column if not exists approval_status text not null default 'APPROVED';

update public.users
set approval_status = 'APPROVED'
where approval_status is null;

DO $$
BEGIN
  ALTER TABLE public.users
  ADD CONSTRAINT users_auth_provider_check
  CHECK (auth_provider in ('password', 'google'));
EXCEPTION
  WHEN duplicate_object THEN null;
END$$;

alter table public.users
drop constraint if exists users_approval_status_check;

DO $$
BEGIN
  ALTER TABLE public.users
  ADD CONSTRAINT users_approval_status_check
  CHECK (approval_status in ('PENDING', 'APPROVED', 'REJECTED'));
EXCEPTION
  WHEN duplicate_object THEN null;
END$$;

update public.users
set role = 'SUPER_ADMIN'
where role::text = 'ADMIN';

alter table public.users
drop constraint if exists users_role_supported_check;

DO $$
BEGIN
  ALTER TABLE public.users
  ADD CONSTRAINT users_role_supported_check
  CHECK (role in ('USER', 'SUPER_ADMIN'));
EXCEPTION
  WHEN duplicate_object THEN null;
END$$;

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  caption text,
  "order" int not null default 0,
  featured boolean not null default false,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.music (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  spotify_url text not null,
  type text not null check (type in ('track', 'playlist')),
  featured boolean not null default false,
  "order" int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  note_color note_color not null default 'CREAM',
  hidden boolean not null default false,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row execute procedure public.set_updated_at();

drop trigger if exists photos_set_updated_at on public.photos;
create trigger photos_set_updated_at
before update on public.photos
for each row execute procedure public.set_updated_at();

drop trigger if exists music_set_updated_at on public.music;
create trigger music_set_updated_at
before update on public.music
for each row execute procedure public.set_updated_at();

drop trigger if exists comments_set_updated_at on public.comments;
create trigger comments_set_updated_at
before update on public.comments
for each row execute procedure public.set_updated_at();

drop trigger if exists content_set_updated_at on public.content;
create trigger content_set_updated_at
before update on public.content
for each row execute procedure public.set_updated_at();

-- Production-safe mode: all access goes through Next.js API using service role key.
alter table public.users enable row level security;
alter table public.photos enable row level security;
alter table public.music enable row level security;
alter table public.comments enable row level security;
alter table public.content enable row level security;
alter table public.admin_audit_logs enable row level security;

-- Prevent direct access from public client roles.
revoke all on table public.users from anon, authenticated;
revoke all on table public.photos from anon, authenticated;
revoke all on table public.music from anon, authenticated;
revoke all on table public.comments from anon, authenticated;
revoke all on table public.content from anon, authenticated;
revoke all on table public.admin_audit_logs from anon, authenticated;

grant usage on schema public to service_role;
grant all on table public.users to service_role;
grant all on table public.photos to service_role;
grant all on table public.music to service_role;
grant all on table public.comments to service_role;
grant all on table public.content to service_role;
grant all on table public.admin_audit_logs to service_role;

drop policy if exists users_service_role_all on public.users;
create policy users_service_role_all
on public.users
for all
to service_role
using (true)
with check (true);

drop policy if exists photos_service_role_all on public.photos;
create policy photos_service_role_all
on public.photos
for all
to service_role
using (true)
with check (true);

drop policy if exists music_service_role_all on public.music;
create policy music_service_role_all
on public.music
for all
to service_role
using (true)
with check (true);

drop policy if exists comments_service_role_all on public.comments;
create policy comments_service_role_all
on public.comments
for all
to service_role
using (true)
with check (true);

drop policy if exists content_service_role_all on public.content;
create policy content_service_role_all
on public.content
for all
to service_role
using (true)
with check (true);

drop policy if exists admin_audit_logs_service_role_all on public.admin_audit_logs;
create policy admin_audit_logs_service_role_all
on public.admin_audit_logs
for all
to service_role
using (true)
with check (true);

insert into storage.buckets (id, name, public)
values ('awrella-photos', 'awrella-photos', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('awrella-avatars', 'awrella-avatars', true)
on conflict (id) do update set public = excluded.public;

create index if not exists idx_photos_order on public.photos ("order");
create index if not exists idx_music_order on public.music ("order");
create index if not exists idx_comments_created_at on public.comments (created_at desc);
create index if not exists idx_admin_audit_logs_created_at on public.admin_audit_logs (created_at desc);
