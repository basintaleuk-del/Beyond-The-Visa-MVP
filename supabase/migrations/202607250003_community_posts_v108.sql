-- Community posts backed by Supabase so posts are visible to all users
-- and persist across sessions / devices.

create table if not exists public.btv_community_posts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  topic       text not null,
  body        text not null check (char_length(body) between 1 and 1200),
  likes       integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.btv_community_replies (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.btv_community_posts(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  body        text not null check (char_length(body) between 1 and 600),
  created_at  timestamptz not null default now()
);

create table if not exists public.btv_community_likes (
  post_id  uuid not null references public.btv_community_posts(id) on delete cascade,
  user_id  uuid not null references auth.users(id) on delete cascade,
  primary key (post_id, user_id)
);

-- Indexes
create index if not exists btv_community_posts_created_at_idx on public.btv_community_posts(created_at desc);
create index if not exists btv_community_replies_post_id_idx on public.btv_community_replies(post_id);

-- RLS
alter table public.btv_community_posts enable row level security;
alter table public.btv_community_replies enable row level security;
alter table public.btv_community_likes enable row level security;

-- Posts: everyone (authenticated) can read; owner can insert/delete
create policy "community_posts_select" on public.btv_community_posts
  for select using (auth.role() = 'authenticated');

create policy "community_posts_insert" on public.btv_community_posts
  for insert with check (auth.uid() = user_id);

create policy "community_posts_delete" on public.btv_community_posts
  for delete using (auth.uid() = user_id);

-- Replies: same pattern
create policy "community_replies_select" on public.btv_community_replies
  for select using (auth.role() = 'authenticated');

create policy "community_replies_insert" on public.btv_community_replies
  for insert with check (auth.uid() = user_id);

create policy "community_replies_delete" on public.btv_community_replies
  for delete using (auth.uid() = user_id);

-- Likes: each user can like once; toggle via insert/delete
create policy "community_likes_select" on public.btv_community_likes
  for select using (auth.role() = 'authenticated');

create policy "community_likes_insert" on public.btv_community_likes
  for insert with check (auth.uid() = user_id);

create policy "community_likes_delete" on public.btv_community_likes
  for delete using (auth.uid() = user_id);

-- Increment / decrement likes safely via DB function (avoids race condition)
create or replace function public.btv_toggle_post_like(p_post_id uuid)
returns jsonb language plpgsql security definer as $$
declare
  v_uid uuid := auth.uid();
  v_liked boolean;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'unauthenticated');
  end if;

  select exists(
    select 1 from public.btv_community_likes
    where post_id = p_post_id and user_id = v_uid
  ) into v_liked;

  if v_liked then
    delete from public.btv_community_likes where post_id = p_post_id and user_id = v_uid;
    update public.btv_community_posts set likes = greatest(0, likes - 1) where id = p_post_id;
    return jsonb_build_object('liked', false);
  else
    insert into public.btv_community_likes(post_id, user_id) values(p_post_id, v_uid);
    update public.btv_community_posts set likes = likes + 1 where id = p_post_id;
    return jsonb_build_object('liked', true);
  end if;
end;
$$;
