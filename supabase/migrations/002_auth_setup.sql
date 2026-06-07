-- supabase/migrations/002_auth_setup.sql
-- Taukei auth setup. Additive migration: extends (does not drop) the existing
-- public.profiles table from 001_taukei_multi_merchant_foundation.sql.
--
-- Rationale for additive approach: merchant_memberships.user_id references
-- public.profiles(id) on delete cascade. Dropping/recreating profiles would
-- cascade-break the FK and lose seeded data. display_name, phone, email, and
-- default_merchant_id from 001 are retained for backward compatibility;
-- full_name is the preferred human-readable field going forward.
--
-- Idempotent: safe to re-run.

set search_path = public;

-- ============================================================================
-- 1. New profile columns
-- ============================================================================
alter table public.profiles
  add column if not exists username text unique,
  add column if not exists full_name text,
  add column if not exists avatar_url text;

-- Case-insensitive username uniqueness. The unique constraint on `username`
-- itself remains (so NULL rows are allowed multiple times — Postgres treats
-- NULL as distinct in unique constraints). This lower() index prevents
-- 'Alice' and 'alice' from coexisting.
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username)) where username is not null;

-- ============================================================================
-- 2. handle_new_user() trigger: auto-create profile row on auth.users insert
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  derived_username text;
begin
  -- Prefer an explicit username in metadata (set during signUp server action).
  -- Otherwise derive from the email local-part. Never assign NULL when we
  -- have a usable string — the lower() unique index will reject empty values
  -- for a column that should be unique, so we coerce NULL/empty to NULL.
  derived_username := nullif(coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  ), '');

  insert into public.profiles (id, email, display_name, full_name, username)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name'
    ),
    new.raw_user_meta_data->>'full_name',
    derived_username
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Drop and recreate the trigger so re-running this migration does not fail.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 3. avatars storage bucket (public read, owner-only write/update/delete)
-- ============================================================================
-- Path convention enforced by RLS: <auth.uid()>/<filename>. This lets public
-- SELECT work for the avatar's URL while preventing cross-user overwrites.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- ============================================================================
-- 4. Storage policies (idempotent via pg_policies guard)
-- ============================================================================
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars public read'
  ) then
    create policy "avatars public read" on storage.objects
      for select to public
      using (bucket_id = 'avatars');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars owner write'
  ) then
    create policy "avatars owner write" on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars owner update'
  ) then
    create policy "avatars owner update" on storage.objects
      for update to authenticated
      using (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
      with check (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars owner delete'
  ) then
    create policy "avatars owner delete" on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end $$;
