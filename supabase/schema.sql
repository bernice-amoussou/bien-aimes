
do $$ begin
  create type public.team_role as enum ('admin', 'member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sermon_language as enum ('fr', 'en');
exception when duplicate_object then null; end $$;


-- Membres de l'équipe. Un compte Auth sans ligne ici n'a AUCUN droit de gestion :
-- l'inscription publique ne donne donc jamais accès à l'administration.
create table if not exists public.team_members (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text,
  role       public.team_role not null default 'member',
  created_at timestamptz not null default now()
);

create table if not exists public.sermons (
  id                   uuid primary key default gen_random_uuid(),
  preached_on          date not null,
  title                text not null
                       check (char_length(btrim(title)) between 1 and 160),
  scripture_references text[] not null
                       check (cardinality(scripture_references) >= 1),
  preacher             text
                       check (preacher is null or char_length(btrim(preacher)) > 0),
  notes                text,
  language             public.sermon_language not null default 'fr',
  is_published         boolean not null default false,
  created_by           uuid references auth.users (id) on delete set null default auth.uid(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table if not exists public.audio_files (
  id               uuid primary key default gen_random_uuid(),
  sermon_id        uuid not null references public.sermons (id) on delete cascade,
  name             text not null check (char_length(btrim(name)) > 0),
  -- Chemin dans le bucket « sermon-audio » : sermons/<sermon_id>/<fichier>
  storage_path     text not null unique,
  duration_seconds numeric check (duration_seconds is null or duration_seconds >= 0),
  format           text not null,
  mime_type        text,
  size_bytes       bigint check (size_bytes is null or size_bytes >= 0),
  is_downloadable  boolean not null default true,
  position         integer not null default 0,
  created_at       timestamptz not null default now()
);

create index if not exists sermons_preached_on_idx on public.sermons (preached_on desc);
create index if not exists sermons_published_idx   on public.sermons (is_published, preached_on desc);
create index if not exists audio_files_sermon_idx  on public.audio_files (sermon_id, position);


-- ─── 3. Mise à jour automatique de updated_at ──────────────────────────────

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists sermons_touch_updated_at on public.sermons;
create trigger sermons_touch_updated_at
  before update on public.sermons
  for each row execute function public.touch_updated_at();


-- ─── 4. Fonctions de rôle (utilisées par les règles RLS) ───────────────────
-- SECURITY DEFINER : elles lisent team_members sans être bloquées par ses
-- propres règles RLS (évite la récursion), et ne renvoient qu'un booléen.

create or replace function public.is_team_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members where user_id = (select auth.uid())
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members
    where user_id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function public.is_team_member() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.is_team_member() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;


-- ─── 5. Droits de base sur les tables ──────────────────────────────────────
-- Les règles RLS ci-dessous restreignent ensuite ligne par ligne.

grant select on public.sermons, public.audio_files to anon, authenticated;
grant insert, update, delete on public.sermons, public.audio_files to authenticated;
grant select, insert, update, delete on public.team_members to authenticated;
revoke all on public.team_members from anon;


-- ─── 6. Règles RLS ─────────────────────────────────────────────────────────

alter table public.sermons      enable row level security;
alter table public.audio_files  enable row level security;
alter table public.team_members enable row level security;

-- Prédications : visiteurs → publiées uniquement ; équipe → toutes.
drop policy if exists "sermons_select" on public.sermons;
create policy "sermons_select" on public.sermons
  for select to anon, authenticated
  using (is_published or (select public.is_team_member()));

drop policy if exists "sermons_insert_team" on public.sermons;
create policy "sermons_insert_team" on public.sermons
  for insert to authenticated
  with check ((select public.is_team_member()));

drop policy if exists "sermons_update_team" on public.sermons;
create policy "sermons_update_team" on public.sermons
  for update to authenticated
  using ((select public.is_team_member()))
  with check ((select public.is_team_member()));

-- Suppression définitive réservée aux administrateurs.
drop policy if exists "sermons_delete_admin" on public.sermons;
create policy "sermons_delete_admin" on public.sermons
  for delete to authenticated
  using ((select public.is_admin()));

-- Fichiers audio : visibles si la prédication est publiée, ou pour l'équipe.
drop policy if exists "audio_files_select" on public.audio_files;
create policy "audio_files_select" on public.audio_files
  for select to anon, authenticated
  using (
    (select public.is_team_member())
    or exists (
      select 1 from public.sermons s
      where s.id = audio_files.sermon_id and s.is_published
    )
  );

drop policy if exists "audio_files_insert_team" on public.audio_files;
create policy "audio_files_insert_team" on public.audio_files
  for insert to authenticated
  with check ((select public.is_team_member()));

drop policy if exists "audio_files_update_team" on public.audio_files;
create policy "audio_files_update_team" on public.audio_files
  for update to authenticated
  using ((select public.is_team_member()))
  with check ((select public.is_team_member()));

drop policy if exists "audio_files_delete_team" on public.audio_files;
create policy "audio_files_delete_team" on public.audio_files
  for delete to authenticated
  using ((select public.is_team_member()));

-- Équipe : chacun voit sa propre ligne ; seuls les administrateurs gèrent l'équipe.
drop policy if exists "team_members_select" on public.team_members;
create policy "team_members_select" on public.team_members
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "team_members_insert_admin" on public.team_members;
create policy "team_members_insert_admin" on public.team_members
  for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "team_members_update_admin" on public.team_members;
create policy "team_members_update_admin" on public.team_members
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "team_members_delete_admin" on public.team_members;
create policy "team_members_delete_admin" on public.team_members
  for delete to authenticated
  using ((select public.is_admin()) and user_id <> (select auth.uid()));


-- ─── 7. Enregistrement transactionnel d'une prédication ───────────────────
-- Crée ou met à jour une prédication ET synchronise ses fichiers audio dans
-- une seule transaction. SECURITY INVOKER : les règles RLS de l'appelant
-- s'appliquent normalement. Renvoie les chemins Storage des fichiers retirés,
-- que l'application supprime ensuite du bucket.
--
-- p_sermon : { id, preached_on, title, scripture_references[], preacher,
--              notes, language, is_published }
-- p_audio  : [ { id? (fichier existant), name, storage_path, duration_seconds,
--                format, mime_type, size_bytes, is_downloadable } ] (dans l'ordre)

create or replace function public.save_sermon(p_sermon jsonb, p_audio jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id      uuid := (p_sermon ->> 'id')::uuid;
  v_refs    text[];
  v_removed text[];
begin
  if not public.is_team_member() then
    raise exception 'not_team_member' using errcode = '42501';
  end if;

  if jsonb_typeof(p_audio) is distinct from 'array' then
    raise exception 'invalid_audio_payload' using errcode = '22023';
  end if;

  -- Les nouveaux fichiers doivent être rangés dans le dossier de la prédication.
  if exists (
    select 1 from jsonb_array_elements(p_audio) a
    where a ->> 'id' is null
      and (a ->> 'storage_path') not like 'sermons/' || v_id::text || '/%'
  ) then
    raise exception 'invalid_storage_path' using errcode = '22023';
  end if;

  select coalesce(array_agg(btrim(r)) filter (where btrim(r) <> ''), '{}')
    into v_refs
    from jsonb_array_elements_text(p_sermon -> 'scripture_references') r;

  insert into public.sermons as s
    (id, preached_on, title, scripture_references, preacher, notes, language, is_published)
  values (
    v_id,
    (p_sermon ->> 'preached_on')::date,
    btrim(p_sermon ->> 'title'),
    v_refs,
    nullif(btrim(p_sermon ->> 'preacher'), ''),
    nullif(btrim(p_sermon ->> 'notes'), ''),
    (p_sermon ->> 'language')::public.sermon_language,
    coalesce((p_sermon ->> 'is_published')::boolean, false)
  )
  on conflict (id) do update set
    preached_on          = excluded.preached_on,
    title                = excluded.title,
    scripture_references = excluded.scripture_references,
    preacher             = excluded.preacher,
    notes                = excluded.notes,
    language             = excluded.language,
    is_published         = excluded.is_published;

  -- Fichiers retirés de la liste.
  with removed as (
    delete from public.audio_files f
    where f.sermon_id = v_id
      and f.id not in (
        select (a ->> 'id')::uuid from jsonb_array_elements(p_audio) a
        where a ->> 'id' is not null
      )
    returning f.storage_path
  )
  select coalesce(array_agg(storage_path), '{}') into v_removed from removed;

  -- Fichiers conservés : nom, téléchargement et ordre.
  update public.audio_files f set
    name            = btrim(a.value ->> 'name'),
    is_downloadable = coalesce((a.value ->> 'is_downloadable')::boolean, true),
    position        = a.ordinality - 1
  from jsonb_array_elements(p_audio) with ordinality as a(value, ordinality)
  where a.value ->> 'id' is not null
    and f.id = (a.value ->> 'id')::uuid
    and f.sermon_id = v_id;

  -- Nouveaux fichiers (déjà téléversés dans Storage par le navigateur).
  insert into public.audio_files
    (sermon_id, name, storage_path, duration_seconds, format, mime_type,
     size_bytes, is_downloadable, position)
  select
    v_id,
    btrim(a.value ->> 'name'),
    a.value ->> 'storage_path',
    (a.value ->> 'duration_seconds')::numeric,
    a.value ->> 'format',
    nullif(a.value ->> 'mime_type', ''),
    (a.value ->> 'size_bytes')::bigint,
    coalesce((a.value ->> 'is_downloadable')::boolean, true),
    a.ordinality - 1
  from jsonb_array_elements(p_audio) with ordinality as a(value, ordinality)
  where a.value ->> 'id' is null;

  return jsonb_build_object('id', v_id, 'removed_paths', to_jsonb(v_removed));
end;
$$;

revoke all on function public.save_sermon(jsonb, jsonb) from public, anon;
grant execute on function public.save_sermon(jsonb, jsonb) to authenticated;


-- ─── 8. Stockage des fichiers audio ────────────────────────────────────────
-- Bucket public en lecture : les lecteurs audio du site utilisent des URL
-- publiques stables. Les chemins contiennent des UUID non devinables.
-- L'écriture (ajout, remplacement, suppression) est réservée à l'équipe.
-- La taille maximale par fichier suit la limite globale du projet
-- (Storage › Settings ; 50 Mo sur l'offre gratuite).

insert into storage.buckets (id, name, public, allowed_mime_types)
values (
  'sermon-audio',
  'sermon-audio',
  true,
  array['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav',
        'audio/x-wav', 'audio/wave', 'audio/ogg', 'audio/webm', 'audio/flac',
        'audio/x-flac', 'audio/opus']
)
on conflict (id) do update
  set public = excluded.public,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "sermon_audio_select_team" on storage.objects;
create policy "sermon_audio_select_team" on storage.objects
  for select to authenticated
  using (bucket_id = 'sermon-audio' and (select public.is_team_member()));

drop policy if exists "sermon_audio_insert_team" on storage.objects;
create policy "sermon_audio_insert_team" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'sermon-audio' and (select public.is_team_member()));

drop policy if exists "sermon_audio_update_team" on storage.objects;
create policy "sermon_audio_update_team" on storage.objects
  for update to authenticated
  using (bucket_id = 'sermon-audio' and (select public.is_team_member()))
  with check (bucket_id = 'sermon-audio' and (select public.is_team_member()));

drop policy if exists "sermon_audio_delete_team" on storage.objects;
create policy "sermon_audio_delete_team" on storage.objects
  for delete to authenticated
  using (bucket_id = 'sermon-audio' and (select public.is_team_member()));


-- ═══════════════════════════════════════════════════════════════════════════
--  9. PREMIER ADMINISTRATEUR — à exécuter séparément, APRÈS avoir créé votre
--  compte dans Authentication › Users (remplacez l'adresse ci-dessous) :
--
--  insert into public.team_members (user_id, email, role)
--  select id, email, 'admin' from auth.users where email = 'vous@exemple.org'
--  on conflict (user_id) do update set role = 'admin';
--
--  Ajouter un membre de l'équipe (droits d'édition, sans suppression) :
--
--  insert into public.team_members (user_id, email, role)
--  select id, email, 'member' from auth.users where email = 'membre@exemple.org'
--  on conflict (user_id) do nothing;
-- ═══════════════════════════════════════════════════════════════════════════
