-- ============================================================================
-- Lemon Bus Cloud Backbone & Spark Document Hub (Supabase / PostgreSQL)
-- Provides sub-80ms event propagation, global monotonic cursor (seq),
-- O(1) SHA-256 content deduplication, and cloud-native Spark Markdown storage
-- without requiring Google Drive Desktop on client/server nodes.
-- ============================================================================

create extension if not exists pgcrypto;

-- 1. Global Reactive Event Bus Log
create table if not exists public.lemon_bus_events (
  seq bigserial primary key,
  event_id uuid not null default gen_random_uuid() unique,
  entity_type text not null check (entity_type in ('NOTE', 'FEED', 'STREAM', 'FOLDER', 'SPARK_FILE')),
  action text not null check (action in ('UPSERT', 'STATUS_CHANGE', 'DELETE')),
  origin text not null default 'DIRECT_API',
  device_id text not null,
  stream_slug text,
  feed_slug text,
  external_id text,
  content_hash text,
  privacy text not null default 'private' check (privacy in ('public', 'private')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_lemon_bus_events_seq
  on public.lemon_bus_events (seq asc);

create index if not exists idx_lemon_bus_events_feed_seq
  on public.lemon_bus_events (feed_slug, seq asc)
  where feed_slug is not null;

create index if not exists idx_lemon_bus_events_stream_seq
  on public.lemon_bus_events (stream_slug, seq asc)
  where stream_slug is not null;

create index if not exists idx_lemon_bus_events_content_hash
  on public.lemon_bus_events (content_hash)
  where content_hash is not null;

-- 2. Cloud-Native Spark Markdown Storage (replaces slow Google Drive Desktop sync)
create table if not exists public.lemon_spark_documents (
  id uuid primary key default gen_random_uuid(),
  canonical_path text not null unique,
  file_name text not null,
  folder_path text not null,
  feed_slug text not null,
  title text not null,
  content_markdown text not null,
  frontmatter jsonb not null default '{}'::jsonb,
  content_hash text not null,
  privacy text not null default 'private' check (privacy in ('public', 'private')),
  origin_provider text not null default 'SUPABASE_SPARK',
  updated_by_device text not null default 'cloud-writer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_lemon_spark_docs_hash
  on public.lemon_spark_documents (content_hash);

create index if not exists idx_lemon_spark_docs_feed
  on public.lemon_spark_documents (feed_slug, updated_at desc);

-- 3. Per-Node Cloud Watermarks (replaces .watermark_<deviceId>.json files)
create table if not exists public.lemon_bus_watermarks (
  device_id text primary key,
  last_seq bigint not null default 0,
  driver text not null default 'supabase',
  last_event_timestamp timestamptz,
  last_seen_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);

-- 4. Automatic Trigger: writing/updating a Spark .md in lemon_spark_documents
--    immediately emits a SPARK_FILE UPSERT into lemon_bus_events (waking all subscribers)
create or replace function public.fn_emit_spark_document_bus_event()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'UPDATE' and old.content_hash = new.content_hash and old.privacy = new.privacy and old.feed_slug = new.feed_slug) then
    return new;
  end if;

  insert into public.lemon_bus_events (
    entity_type,
    action,
    origin,
    device_id,
    feed_slug,
    external_id,
    content_hash,
    privacy,
    payload
  ) values (
    'SPARK_FILE',
    'UPSERT',
    coalesce(new.origin_provider, 'SUPABASE_SPARK'),
    coalesce(new.updated_by_device, 'supabase-trigger'),
    new.feed_slug,
    new.canonical_path,
    new.content_hash,
    new.privacy,
    jsonb_build_object(
      'documentId', new.id,
      'canonicalPath', new.canonical_path,
      'fileName', new.file_name,
      'folderPath', new.folder_path,
      'feedSlug', new.feed_slug,
      'title', new.title,
      'contentMarkdown', new.content_markdown,
      'frontmatter', new.frontmatter,
      'contentHash', new.content_hash,
      'privacy', new.privacy,
      'origin', coalesce(new.origin_provider, 'SUPABASE_SPARK'),
      'updatedAt', new.updated_at
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_spark_document_to_bus on public.lemon_spark_documents;
create trigger trg_spark_document_to_bus
after insert or update on public.lemon_spark_documents
for each row execute function public.fn_emit_spark_document_bus_event();

-- 5. Enable Supabase Realtime publication for sub-80ms WebSocket push
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.lemon_bus_events;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.lemon_spark_documents;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

-- ============================================================================
-- 6. 30-Day Sliding Buffer Maintenance (Retention Cleanup)
--
-- IMPORTANT SAFETY GUARANTEE:
-- This function purges ONLY transient event logs and buffer documents
-- inside cloud PostgreSQL tables (lemon_bus_events, lemon_spark_documents).
-- It NEVER affects, deletes, or touches any files on Google Drive, local filesystems,
-- or persistent notes in Lemon Seasons backend cold storage.
-- ============================================================================
create or replace function public.fn_purge_expired_bus_events(retention_days integer default 30)
returns table (purged_events_count bigint, purged_docs_count bigint)
language plpgsql
security definer
as $$
declare
  v_events_count bigint := 0;
  v_docs_count bigint := 0;
begin
  with deleted_events as (
    delete from public.lemon_bus_events
    where created_at < now() - (retention_days || ' days')::interval
    returning 1
  )
  select count(*) into v_events_count from deleted_events;

  with deleted_docs as (
    delete from public.lemon_spark_documents
    where updated_at < now() - (retention_days || ' days')::interval
    returning 1
  )
  select count(*) into v_docs_count from deleted_docs;

  return query select v_events_count, v_docs_count;
end;
$$;

